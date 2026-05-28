/**
 * Build An Agent - s15: 执行日志
 *
 * 工作流执行器。
 * 按拓扑顺序遍历节点，调用对应的 runner，
 * 并通过 ExecutionLogger 记录每个节点的执行详情。
 */

import type { Workflow, WorkflowNode, ExecutionRun } from "./types";
import { ExecutionLogger } from "./logger";
import { runLLMNode, runToolNode, runConditionNode } from "./runners";

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
 * listener 会在每次节点状态变化时被调用，用于实时更新 UI。
 */
export async function executeWorkflow(
  workflow: Workflow,
  input: Record<string, unknown>,
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
    // 如果上游出错，后续节点全部跳过
    if (hasError) {
      logger.skipNode(node.id, node.type);
      continue;
    }

    // 收集节点输入：来自上游节点的输出
    const nodeInput = collectNodeInput(node, workflow, context);

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

/** 收集节点输入：找到所有指向该节点的边，把源节点的输出合并 */
function collectNodeInput(
  node: WorkflowNode,
  workflow: Workflow,
  context: Record<string, unknown>,
): unknown {
  const incomingEdges = workflow.edges.filter((e) => e.target === node.id);
  if (incomingEdges.length === 0) return null;
  if (incomingEdges.length === 1) return context[incomingEdges[0].source];

  // 多个输入合并为对象
  const inputs: Record<string, unknown> = {};
  for (const edge of incomingEdges) {
    inputs[edge.source] = context[edge.source];
  }
  return inputs;
}

/** 根据节点类型分派到对应的 runner */
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
