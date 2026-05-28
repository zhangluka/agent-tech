/**
 * Build An Agent - s13: 连线与执行
 *
 * 执行引擎：遍历节点图，按拓扑顺序执行每个节点。
 *
 * 核心思路：
 * 1. 把节点和连线看成一张有向无环图（DAG）
 * 2. 用拓扑排序确定执行顺序
 * 3. 按顺序执行每个节点，把输出写入上下文
 * 4. 下游节点可以通过模板语法引用上游节点的输出
 */

import type { FlowNode, FlowEdge, ExecutionContext, ExecutionLog, NodeStatus } from "./types";
import { runners } from "./runners";

/** 执行过程中的回调，用于实时更新 UI */
export interface ExecutionCallbacks {
  onNodeStatusChange: (nodeId: string, status: NodeStatus) => void;
  onLog: (log: ExecutionLog) => void;
  onOutput: (nodeId: string, output: string) => void;
  onComplete: () => void;
  onError: (nodeId: string, error: string) => void;
}

/**
 * 拓扑排序：确定节点的执行顺序。
 *
 * 算法：Kahn's algorithm（删入度法）
 * 1. 统计每个节点的入度（有多少条边指向它）
 * 2. 把入度为 0 的节点放进队列
 * 3. 每次从队列取出一个节点，把它指向的节点的入度减 1
 * 4. 如果某个节点的入度变成 0，放进队列
 * 5. 重复直到队列为空
 *
 * 返回节点 ID 的有序数组。排在前面的先执行。
 */
export function topologicalSort(nodes: FlowNode[], edges: FlowEdge[]): string[] {
  // 建立邻接表和入度表
  const inDegree: Record<string, number> = {};
  const adjacency: Record<string, string[]> = {};

  for (const node of nodes) {
    inDegree[node.id] = 0;
    adjacency[node.id] = [];
  }

  for (const edge of edges) {
    // 条件节点的 false 分支：只有当表达式结果为 false 时才走这条边
    // 拓扑排序阶段先全部算入，执行阶段再决定走哪条
    adjacency[edge.source].push(edge.target);
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const id in inDegree) {
    if (inDegree[id] === 0) {
      queue.push(id);
    }
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    for (const neighbor of adjacency[current]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  // 检测环：如果结果长度不等于节点数，说明有环
  if (result.length !== nodes.length) {
    throw new Error("节点图中存在循环依赖，无法执行");
  }

  return result;
}

/**
 * 执行整个工作流。
 *
 * @param nodes - 所有节点
 * @param edges - 所有连线
 * @param callbacks - 执行过程中的回调函数
 * @returns 最终的执行上下文
 */
export async function executeWorkflow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  callbacks: ExecutionCallbacks
): Promise<ExecutionContext> {
  // 1. 拓扑排序，确定执行顺序
  const order = topologicalSort(nodes, edges);

  // 2. 初始化执行上下文
  const context: ExecutionContext = {
    outputs: {},
    currentNodeId: null,
    logs: [],
    aborted: false,
  };

  // 建立节点 ID → 节点的映射，方便查找
  const nodeMap: Record<string, FlowNode> = {};
  for (const node of nodes) {
    nodeMap[node.id] = node;
  }

  // 建立节点 ID → 出边列表的映射
  const outEdges: Record<string, FlowEdge[]> = {};
  for (const edge of edges) {
    if (!outEdges[edge.source]) outEdges[edge.source] = [];
    outEdges[edge.source].push(edge);
  }

  // 3. 按拓扑顺序执行
  for (const nodeId of order) {
    // 检查是否被中止
    if (context.aborted) break;

    const node = nodeMap[nodeId];
    if (!node) continue;

    // 跳过条件节点的 false 分支目标（如果上游条件为 false）
    if (shouldSkipNode(nodeId, nodeMap, outEdges, context)) {
      callbacks.onNodeStatusChange(nodeId, "completed");
      addLog(context, callbacks, node, "跳过（条件分支未选中）", "warning");
      continue;
    }

    // 更新状态：正在执行
    context.currentNodeId = nodeId;
    callbacks.onNodeStatusChange(nodeId, "running");
    addLog(context, callbacks, node, "开始执行", "info");

    // 找到对应的 runner
    const runner = runners[node.type];
    if (!runner) {
      const error = `未知的节点类型: ${node.type}`;
      callbacks.onNodeStatusChange(nodeId, "error");
      callbacks.onError(nodeId, error);
      addLog(context, callbacks, node, error, "error");
      continue;
    }

    // 执行
    try {
      const output = await runner.run(node, context);
      context.outputs[nodeId] = output;

      // 对条件节点，记录结果但不中断
      if (node.type === "condition") {
        addLog(context, callbacks, node, `条件结果: ${output}`, "success");
      }

      callbacks.onNodeStatusChange(nodeId, "completed");
      callbacks.onOutput(nodeId, output);
      addLog(context, callbacks, node, `执行完成`, "success");
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      callbacks.onNodeStatusChange(nodeId, "error");
      callbacks.onError(nodeId, error);
      addLog(context, callbacks, node, `执行失败: ${error}`, "error");
      // 不 break，继续执行其他节点
    }
  }

  context.currentNodeId = null;
  callbacks.onComplete();
  return context;
}

/**
 * 判断某个节点是否应该跳过。
 *
 * 如果一个节点的前驱是一个条件节点，且条件结果为 false，
 * 且连线没有标记 sourcePort: "true"，则跳过。
 */
function shouldSkipNode(
  nodeId: string,
  nodeMap: Record<string, FlowNode>,
  outEdges: Record<string, FlowEdge[]>,
  context: ExecutionContext
): boolean {
  // 找到所有指向这个节点的边
  for (const sourceId in outEdges) {
    const edges = outEdges[sourceId];
    for (const edge of edges) {
      if (edge.target !== nodeId) continue;

      const sourceNode = nodeMap[sourceId];
      if (!sourceNode || sourceNode.type !== "condition") continue;

      const conditionResult = context.outputs[sourceId];
      // 如果条件结果是 "false"，且这条边不是 true 分支，则跳过
      if (conditionResult === "false" && edge.sourcePort !== "false") {
        return true;
      }
      // 如果条件结果是 "true"，且这条边是 false 分支，则跳过
      if (conditionResult === "true" && edge.sourcePort === "false") {
        return true;
      }
    }
  }
  return false;
}

/** 添加日志 */
function addLog(
  context: ExecutionContext,
  callbacks: ExecutionCallbacks,
  node: FlowNode,
  message: string,
  type: ExecutionLog["type"]
) {
  const log: ExecutionLog = {
    timestamp: Date.now(),
    nodeId: node.id,
    nodeLabel: node.label,
    message,
    type,
  };
  context.logs.push(log);
  callbacks.onLog(log);
}
