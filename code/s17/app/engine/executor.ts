/**
 * Build An Agent - s17: 错误恢复
 *
 * 工作流执行器。
 * 在 s15 基础上集成了三层错误恢复机制：
 *   1. 重试：暂时性错误自动重试（指数退避）
 *   2. 回退：某个工具失败时尝试替代方案
 *   3. 回滚：彻底失败时恢复到执行前的状态
 */

import type {
  Workflow,
  WorkflowNode,
  ExecutionRun,
  NodeError,
  ErrorRecoveryConfig,
  ErrorAction,
  DEFAULT_RECOVERY_CONFIG,
} from "./types";
import { ExecutionLogger } from "./logger";
import { retryWithBackoff, classifyError } from "./retry";
import { takeSnapshot, restoreSnapshot, SnapshotStack } from "./snapshot";
import { runLLMNode, runToolNode, runConditionNode, runFallbackTool } from "./runners";

type Listener = (run: ExecutionRun) => void;

/* ── 拓扑排序 ──────────────────────────────── */

function topoSort(workflow: Workflow): WorkflowNode[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of workflow.nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }
  for (const edge of workflow.edges) {
    adj.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  const queue = workflow.nodes
    .filter((n) => inDegree.get(n.id) === 0)
    .map((n) => n.id);

  const sorted: WorkflowNode[] = [];
  const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));

  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(nodeMap.get(id)!);
    for (const next of adj.get(id) || []) {
      const deg = inDegree.get(next)! - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  return sorted;
}

/* ── 执行器 ────────────────────────────────── */

/**
 * 执行工作流，返回 ExecutionRun 记录。
 *
 * 新增参数：
 *   - config: 错误恢复配置（重试次数、延迟等）
 *   - onNodeError: 节点失败时的回调（用于弹出 ErrorBanner 让用户选择动作）
 */
export async function executeWorkflow(
  workflow: Workflow,
  input: Record<string, unknown>,
  listener?: Listener,
  config?: Partial<ErrorRecoveryConfig>,
  onNodeError?: (
    nodeId: string,
    error: NodeError,
    attempt: number,
  ) => Promise<ErrorAction>,
): Promise<ExecutionRun> {
  const fullConfig: ErrorRecoveryConfig = {
    ...({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      autoRollback: true,
    } as ErrorRecoveryConfig),
    ...config,
  };

  const logger = new ExecutionLogger(workflow.id, workflow.name);
  if (listener) logger.onUpdate(listener);

  // ── 拍快照 ──
  const snapshotStack = new SnapshotStack(5);
  const initialSnapshot = takeSnapshot({ ...input }, workflow.nodes);
  snapshotStack.push(initialSnapshot);

  const sorted = topoSort(workflow);
  const context: Record<string, unknown> = { ...input };
  let hasError = false;
  let rolledBack = false;

  for (const node of sorted) {
    // 上游出错 → 后续节点全部跳过
    if (hasError) {
      logger.skipNode(node.id, node.type);
      continue;
    }

    const nodeInput = collectNodeInput(node, workflow, context);
    logger.startNode(node.id, node.type, nodeInput);

    try {
      // ── 带重试的节点执行 ──
      const { result, attempts, retryHistory } = await retryWithBackoff(
        () => executeNodeWithFallback(node, nodeInput, fullConfig),
        fullConfig,
        (error, attempt, delay) => {
          // 重试中：更新日志状态
          logger.markRetrying(node.id, error, attempt, delay);
        },
      );

      // 成功
      context[node.id] = result;
      logger.finishNode(node.id, result, attempts, retryHistory);
    } catch (err) {
      const nodeError: NodeError =
        err && typeof err === "object" && "classification" in err
          ? (err as NodeError)
          : {
              message: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined,
              classification: classifyError(err),
            };

      // ── 用户决策 ──
      if (onNodeError) {
        const action = await onNodeError(node.id, nodeError, 0);

        switch (action) {
          case "skip":
            // 跳过这个节点，继续执行后续节点
            logger.skipNode(node.id, node.type);
            context[node.id] = null; // 给一个空输出
            continue; // 注意：不设置 hasError，后续节点继续执行

          case "retry":
            // 用户手动重试（从头开始，不计入自动重试次数）
            try {
              const result = await executeNodeWithFallback(node, nodeInput, fullConfig);
              context[node.id] = result;
              logger.finishNode(node.id, result, 0, []);
            } catch (retryErr) {
              hasError = true;
              logger.failNode(node.id, {
                message: retryErr instanceof Error ? retryErr.message : String(retryErr),
                classification: "permanent",
              });
            }
            continue;

          case "abort":
          default:
            // 终止执行 + 回滚
            hasError = true;
            logger.failNode(node.id, nodeError);

            if (fullConfig.autoRollback) {
              const snapshot = snapshotStack.pop();
              if (snapshot) {
                const { context: restored, nodesToReset } = restoreSnapshot(
                  snapshot,
                  logger.getRun().nodeLogs,
                );
                // 恢复上下文
                Object.keys(context).forEach((k) => delete context[k]);
                Object.assign(context, restored);
                // 重置已执行节点的状态
                for (const nid of nodesToReset) {
                  logger.resetNode(nid);
                }
                rolledBack = true;
              }
            }
            break;
        }
      } else {
        // 没有用户回调，直接失败
        hasError = true;
        logger.failNode(node.id, nodeError);
      }
    }
  }

  logger.finish(
    rolledBack ? "rolled_back" : hasError ? "error" : "success",
    rolledBack,
  );
  return logger.getRun();
}

/* ── 带回退的节点执行 ──────────────────────── */

/**
 * 执行单个节点，如果主工具失败则尝试回退方案。
 *
 * 回退策略（仅对 tool 节点生效）：
 *   read_file 失败 → 尝试 search_files
 *   http_request 失败 → 尝试缓存版本
 *   其他工具失败 → 不回退，直接抛错
 */
async function executeNodeWithFallback(
  node: WorkflowNode,
  input: unknown,
  config: ErrorRecoveryConfig,
): Promise<unknown> {
  try {
    return await runNode(node, input);
  } catch (primaryError) {
    // 只有 tool 节点有回退方案
    if (node.type === "tool") {
      const fallbackResult = await runFallbackTool(node.data, input, primaryError);
      if (fallbackResult !== null) {
        return fallbackResult;
      }
    }
    throw primaryError;
  }
}

/* ── 辅助函数 ──────────────────────────────── */

function collectNodeInput(
  node: WorkflowNode,
  workflow: Workflow,
  context: Record<string, unknown>,
): unknown {
  const incomingEdges = workflow.edges.filter((e) => e.target === node.id);
  if (incomingEdges.length === 0) return null;
  if (incomingEdges.length === 1) return context[incomingEdges[0].source];

  const inputs: Record<string, unknown> = {};
  for (const edge of incomingEdges) {
    inputs[edge.source] = context[edge.source];
  }
  return inputs;
}

async function runNode(
  node: WorkflowNode,
  input: unknown,
): Promise<unknown> {
  switch (node.type) {
    case "llm":
      return runLLMNode(node.data, input);
    case "tool":
      return runToolNode(node.data, input);
    case "condition":
      return runConditionNode(node.data, input);
    case "input":
      return input;
    case "output":
      return input;
    default:
      throw new Error(`未知节点类型: ${node.type}`);
  }
}
