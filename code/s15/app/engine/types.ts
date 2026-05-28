/**
 * Build An Agent - s15: 执行日志
 *
 * 核心类型定义。
 * 包含工作流结构、节点类型、执行日志等。
 */

/* ── 工作流结构 ─────────────────────────────── */

export type NodeType = "llm" | "tool" | "condition" | "input" | "output";

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

/* ── 执行日志 ───────────────────────────────── */

export type NodeStatus = "pending" | "running" | "success" | "error" | "skipped";

export interface NodeError {
  message: string;
  stack?: string;
}

export interface NodeLog {
  nodeId: string;
  nodeType: NodeType;
  status: NodeStatus;
  input: unknown;
  output: unknown;
  error?: NodeError;
  startedAt: number;   // Date.now()
  finishedAt: number;
  duration: number;    // 毫秒
}

export type RunStatus = "running" | "success" | "error" | "cancelled";

export interface ExecutionRun {
  id: string;
  workflowId: string;
  workflowName: string;
  status: RunStatus;
  startedAt: number;
  finishedAt: number;
  duration: number;
  nodeLogs: NodeLog[];
}
