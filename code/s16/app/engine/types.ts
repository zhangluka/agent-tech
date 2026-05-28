/**
 * Build An Agent - s16: 权限与确认
 *
 * 核心类型定义。
 * 在 s15 基础上增加了权限相关类型。
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

/* ── 执行日志（与 s15 相同）──────────────────── */

export type NodeStatus = "pending" | "running" | "success" | "error" | "skipped" | "denied";

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
  startedAt: number;
  finishedAt: number;
  duration: number;
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

/* ── 权限系统（s16 新增）────────────────────── */

/** 工具风险等级 */
export type RiskLevel = "safe" | "moderate" | "dangerous";

/** 用户对某次工具调用的决定 */
export type PermissionDecision = "allow" | "deny" | "always_allow";

/** 单条权限日志 */
export interface PermissionLog {
  id: string;
  nodeId: string;
  toolName: string;
  args: unknown;
  riskLevel: RiskLevel;
  decision: PermissionDecision;
  reason?: string;
  timestamp: number;
}

/** 权限检查结果 */
export interface PermissionCheckResult {
  /** 是否允许执行 */
  allowed: boolean;
  /** 风险等级 */
  riskLevel: RiskLevel;
  /** 如果需要确认，返回待确认信息 */
  pendingConfirmation?: PendingConfirmation;
}

/** 待确认的工具调用 */
export interface PendingConfirmation {
  id: string;
  nodeId: string;
  toolName: string;
  args: unknown;
  riskLevel: RiskLevel;
  timestamp: number;
}

/** 会话级权限配置 */
export interface SessionPermissions {
  /** 本次会话中始终允许的工具列表 */
  alwaysAllow: Set<string>;
  /** 本次会话中始终拒绝的工具列表 */
  alwaysDeny: Set<string>;
}
