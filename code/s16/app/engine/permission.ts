/**
 * Build An Agent - s16: 权限与确认
 *
 * 权限中间件。
 * 在工具执行前拦截调用，根据风险等级决定：放行、拦截、或要求用户确认。
 *
 * 设计思路：
 *   1. 每个工具都有一个风险等级（safe / moderate / dangerous）
 *   2. safe 的工具直接放行，dangerous 的工具必须经过用户确认
 *   3. 用户可以选择"始终允许"某个工具，后续同类调用不再弹窗
 *   4. 所有决定都记入日志，方便审计
 */

import type {
  RiskLevel,
  PermissionDecision,
  PermissionCheckResult,
  PendingConfirmation,
  PermissionLog,
  SessionPermissions,
} from "./types";

/* ── 工具风险分类 ────────────────────────────── */

/**
 * 工具 → 风险等级的映射表。
 * 不在表里的工具默认 moderate。
 */
const RISK_MAP: Record<string, RiskLevel> = {
  // safe：只读，不改变任何状态
  read_file: "safe",
  list_files: "safe",
  search: "safe",
  http_get: "safe",

  // moderate：有副作用但可逆
  http_request: "moderate",
  write_file: "moderate",

  // dangerous：不可逆或影响范围大
  delete_file: "dangerous",
  execute_command: "dangerous",
  send_email: "dangerous",
  deploy: "dangerous",
};

/** 查询工具的风险等级 */
export function getRiskLevel(toolName: string): RiskLevel {
  return RISK_MAP[toolName] ?? "moderate";
}

/* ── 权限检查器 ──────────────────────────────── */

export class PermissionChecker {
  private session: SessionPermissions;
  private logs: PermissionLog[] = [];
  private pendingId = 0;

  constructor(session: SessionPermissions) {
    this.session = session;
  }

  /**
   * 检查一次工具调用是否被允许。
   * 返回结果告诉调用方：直接放行、直接拒绝、还是需要弹窗确认。
   */
  check(nodeId: string, toolName: string, args: unknown): PermissionCheckResult {
    const riskLevel = getRiskLevel(toolName);

    // 1. 检查会话级"始终允许"
    if (this.session.alwaysAllow.has(toolName)) {
      this.logDecision(nodeId, toolName, args, riskLevel, "always_allow");
      return { allowed: true, riskLevel };
    }

    // 2. 检查会话级"始终拒绝"
    if (this.session.alwaysDeny.has(toolName)) {
      this.logDecision(nodeId, toolName, args, riskLevel, "deny");
      return { allowed: false, riskLevel };
    }

    // 3. safe 级别直接放行
    if (riskLevel === "safe") {
      this.logDecision(nodeId, toolName, args, riskLevel, "allow");
      return { allowed: true, riskLevel };
    }

    // 4. moderate 和 dangerous 需要用户确认
    const pendingId = `conf_${++this.pendingId}_${Date.now()}`;
    return {
      allowed: false,
      riskLevel,
      pendingConfirmation: {
        id: pendingId,
        nodeId,
        toolName,
        args,
        riskLevel,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * 用户做出决定后调用此方法。
   * 如果是 always_allow，同时更新会话配置。
   */
  resolve(
    confirmation: PendingConfirmation,
    decision: PermissionDecision,
  ): boolean {
    // 记录日志
    this.logDecision(
      confirmation.nodeId,
      confirmation.toolName,
      confirmation.args,
      confirmation.riskLevel,
      decision,
    );

    // 如果选择"始终允许"，加入会话白名单
    if (decision === "always_allow") {
      this.session.alwaysAllow.add(confirmation.toolName);
      return true;
    }

    return decision === "allow";
  }

  /** 获取权限日志 */
  getLogs(): PermissionLog[] {
    return [...this.logs];
  }

  /* ── 私有方法 ──────────────────────────────── */

  private logDecision(
    nodeId: string,
    toolName: string,
    args: unknown,
    riskLevel: RiskLevel,
    decision: PermissionDecision,
  ): void {
    this.logs.push({
      id: `plog_${this.logs.length + 1}`,
      nodeId,
      toolName,
      args,
      riskLevel,
      decision,
      timestamp: Date.now(),
    });
  }
}

/* ── 风险等级的显示信息 ──────────────────────── */

export const RISK_DISPLAY: Record<
  RiskLevel,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  safe: {
    label: "安全",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
  moderate: {
    label: "中等",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  dangerous: {
    label: "危险",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
};
