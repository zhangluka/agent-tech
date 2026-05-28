/**
 * Build An Agent - s17: 错误恢复
 *
 * 核心类型定义。
 * 在 s15 基础上增加了错误分类、重试状态、快照等类型。
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

export type NodeStatus = "pending" | "running" | "success" | "error" | "skipped" | "retrying";

export interface NodeError {
  message: string;
  stack?: string;
  /** 错误分类：transient 可重试，permanent 不可重试 */
  classification: ErrorClassification;
  /** HTTP 状态码（如果有） */
  statusCode?: number;
}

export type ErrorClassification = "transient" | "permanent" | "unknown";

export interface NodeLog {
  nodeId: string;
  nodeType: NodeType;
  status: NodeStatus;
  input: unknown;
  output: unknown;
  error?: NodeError;
  startedAt: number;
  finishedAt: number;
  duration: number;
  /** 重试次数（0 表示没有重试） */
  retryCount: number;
  /** 每次重试的详情 */
  retryHistory: RetryAttempt[];
}

export interface RetryAttempt {
  attempt: number;
  startedAt: number;
  finishedAt: number;
  error: NodeError;
}

export type RunStatus = "running" | "success" | "error" | "cancelled" | "rolled_back";

export interface ExecutionRun {
  id: string;
  workflowId: string;
  workflowName: string;
  status: RunStatus;
  startedAt: number;
  finishedAt: number;
  duration: number;
  nodeLogs: NodeLog[];
  /** 是否发生了回滚 */
  rolledBack: boolean;
}

/* ── 快照 ───────────────────────────────────── */

export interface WorkflowSnapshot {
  /** 快照时间戳 */
  timestamp: number;
  /** 执行上下文的深拷贝 */
  context: Record<string, unknown>;
  /** 已完成的节点 ID 列表 */
  completedNodeIds: string[];
  /** 每个节点的输出（用于回滚恢复） */
  nodeOutputs: Record<string, unknown>;
}

/* ── 错误恢复动作 ───────────────────────────── */

export type ErrorAction = "retry" | "skip" | "abort" | "fallback";

export interface ErrorRecoveryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 基础延迟（毫秒） */
  baseDelay: number;
  /** 最大延迟（毫秒） */
  maxDelay: number;
  /** 是否启用自动回滚 */
  autoRollback: boolean;
  /** 失败时的用户回调（返回用户选择的动作） */
  onNodeError?: (nodeId: string, error: NodeError, attempt: number) => Promise<ErrorAction>;
}

export const DEFAULT_RECOVERY_CONFIG: ErrorRecoveryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  autoRollback: true,
};
