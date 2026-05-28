/**
 * Build An Agent - s13: 连线与执行
 *
 * 执行引擎的类型定义。
 */

/** 节点执行状态 */
export type NodeStatus = "pending" | "running" | "completed" | "error";

/** 节点类型 */
export type NodeType = "start" | "llm" | "tool" | "condition" | "end";

/** 画布上的节点 */
export interface FlowNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  config: Record<string, string>;
}

/** 节点之间的连线 */
export interface FlowEdge {
  id: string;
  source: string; // 源节点 ID
  target: string; // 目标节点 ID
  sourcePort?: string; // 条件节点的输出端口："true" 或 "false"
}

/** 单个节点的执行结果 */
export interface NodeResult {
  nodeId: string;
  status: NodeStatus;
  output: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

/** 整个执行上下文，在节点之间传递数据 */
export interface ExecutionContext {
  /** 所有节点的输出，key 是节点 ID */
  outputs: Record<string, string>;
  /** 当前正在执行的节点 ID */
  currentNodeId: string | null;
  /** 执行日志 */
  logs: ExecutionLog[];
  /** 是否已中止 */
  aborted: boolean;
}

/** 执行日志条目 */
export interface ExecutionLog {
  timestamp: number;
  nodeId: string;
  nodeLabel: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

/** 节点执行器的接口 */
export interface NodeRunner {
  run(node: FlowNode, context: ExecutionContext): Promise<string>;
}
