/**
 * 工作流执行引擎 — s13 原版
 *
 * 接收 nodes + edges，按拓扑顺序逐个执行。
 * 每个节点执行完后把结果传给下游节点的对应输入。
 */

import type { Node, Edge } from "reactflow";
import { runners, type RunContext } from "./runners";

export type NodeStatus = "idle" | "running" | "done" | "error";

export interface ExecuteResult {
  nodeId: string;
  status: NodeStatus;
  output?: unknown;
  error?: string;
  duration?: number;
}

export type OnUpdate = (nodeId: string, status: NodeStatus, output?: unknown, error?: string) => void;

/** 拓扑排序：返回从上游到下游的节点 ID 顺序 */
function topoSort(nodes: Node[], edges: Edge[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  }

  for (const e of edges) {
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    adjacency.get(e.source)!.push(e.target);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adjacency.get(id) || []) {
      const newDeg = inDegree.get(next)! - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  return order;
}

/**
 * 执行整个工作流。
 * onUpdate 会在每个节点状态变化时被调用。
 */
export async function executeWorkflow(
  nodes: Node[],
  edges: Edge[],
  onUpdate?: OnUpdate
): Promise<ExecuteResult[]> {
  const order = topoSort(nodes, edges);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const outputs = new Map<string, unknown>();
  const results: ExecuteResult[] = [];

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId)!;
    const runner = runners[node.type || ""];

    if (!runner) {
      onUpdate?.(nodeId, "error", undefined, `未知节点类型: ${node.type}`);
      results.push({ nodeId, status: "error", error: `未知节点类型: ${node.type}` });
      continue;
    }

    // 收集上游输出作为当前节点的输入
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    const inputs: Record<string, unknown> = {};
    for (const e of incomingEdges) {
      const handle = e.targetHandle || "default";
      inputs[handle] = outputs.get(e.source);
    }

    onUpdate?.(nodeId, "running");
    const start = Date.now();

    try {
      const ctx: RunContext = {
        nodeData: node.data,
        inputs,
      };
      const output = await runner(ctx);
      const duration = Date.now() - start;

      outputs.set(nodeId, output);
      onUpdate?.(nodeId, "done", output);
      results.push({ nodeId, status: "done", output, duration });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onUpdate?.(nodeId, "error", undefined, msg);
      results.push({ nodeId, status: "error", error: msg, duration: Date.now() - start });
    }
  }

  return results;
}
