/**
 * Build An Agent - s16: 权限与确认
 *
 * 工作流执行器。
 * 在 s15 基础上集成权限中间件：执行 tool 节点前先检查权限。
 *
 * 关键变化：
 *   - executeWorkflow 现在接受一个 PermissionChecker 实例
 *   - 执行 tool 节点时，先调 checker.check()
 *   - 如果需要确认，通过回调暂停执行，等用户决定后继续
 *   - 新增 nodeStatus "denied" 表示被权限拒绝
 */

import type { Workflow, WorkflowNode, ExecutionRun, PendingConfirmation } from "./types";
import { ExecutionLogger } from "./logger";
import { PermissionChecker } from "./permission";
import { runLLMNode, runToolNode, runConditionNode } from "./runners";

type Listener = (run: ExecutionRun) => void;

/**
 * 当需要用户确认时调用。
 * 返回用户的选择：true = 允许执行，false = 跳过该节点。
 */
type ConfirmationHandler = (confirmation: PendingConfirmation) => Promise<boolean>;

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
 * 执行工作流。
 *
 * @param workflow       工作流定义
 * @param input          初始输入
 * @param checker        权限检查器
 * @param onConfirm      需要确认时的回调（弹窗）
 * @param listener       执行状态实时回调
 */
export async function executeWorkflow(
  workflow: Workflow,
  input: Record<string, unknown>,
  checker: PermissionChecker,
  onConfirm: ConfirmationHandler,
  listener?: Listener,
): Promise<ExecutionRun> {
  const logger = new ExecutionLogger(workflow.id, workflow.name);

  if (listener) {
    logger.onUpdate(listener);
  }

  const sorted = topoSort(workflow);
  const context: Record<string, unknown> = { ...input };
  let hasError = false;

  for (const node of sorted) {
    // 上游出错，后续节点跳过
    if (hasError) {
      logger.skipNode(node.id, node.type);
      continue;
    }

    const nodeInput = collectNodeInput(node, workflow, context);

    // tool 节点需要权限检查
    if (node.type === "tool") {
      const toolName = (node.data.tool as string) || "unknown";
      const checkResult = checker.check(node.id, toolName, nodeInput);

      if (!checkResult.allowed) {
        if (checkResult.pendingConfirmation) {
          // 需要用户确认——暂停，等回调
          logger.startNode(node.id, node.type, nodeInput);

          const userApproved = await onConfirm(checkResult.pendingConfirmation);

          if (userApproved) {
            // 用户允许，继续执行
            try {
              const output = await runToolNode(node.data, nodeInput);
              context[node.id] = output;
              logger.finishNode(node.id, output);
            } catch (err) {
              hasError = true;
              logger.failNode(node.id, {
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined,
              });
            }
          } else {
            // 用户拒绝，标记为 denied
            logger.denyNode(node.id, node.type);
            hasError = true;
          }
        } else {
          // 始终拒绝（会话级 deny list）
          logger.startNode(node.id, node.type, nodeInput);
          logger.denyNode(node.id, node.type);
          hasError = true;
        }

        continue;
      }
    }

    // 正常执行
    logger.startNode(node.id, node.type, nodeInput);

    try {
      const output = await runNode(node, nodeInput);
      context[node.id] = output;
      logger.finishNode(node.id, output);
    } catch (err) {
      hasError = true;
      logger.failNode(node.id, {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  }

  logger.finish(hasError ? "error" : "success");
  return logger.getRun();
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
