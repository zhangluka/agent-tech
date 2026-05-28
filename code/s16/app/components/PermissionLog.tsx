"use client";

/**
 * Build An Agent - s16: 权限与确认
 *
 * 权限日志组件。
 * 显示本次会话中所有权限决定的历史记录。
 * 每条记录包含：工具名、风险等级、决定、时间。
 */

import type { PermissionLog as PermissionLogEntry } from "../engine/types";
import { RISK_DISPLAY } from "../engine/permission";

interface Props {
  logs: PermissionLogEntry[];
}

export default function PermissionLog({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="text-xs text-zinc-600 text-center py-6">
        暂无权限记录
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {logs.map((log) => (
        <PermissionLogItem key={log.id} log={log} />
      ))}
    </div>
  );
}

function PermissionLogItem({ log }: { log: PermissionLogEntry }) {
  const risk = RISK_DISPLAY[log.riskLevel];
  const decisionInfo = getDecisionInfo(log.decision);

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800/50 transition-colors">
      {/* 决定图标 */}
      <span className={`text-xs font-mono ${decisionInfo.color}`}>
        {decisionInfo.icon}
      </span>

      {/* 工具名 */}
      <span className="text-xs font-mono text-zinc-300 truncate flex-1">
        {log.toolName}
      </span>

      {/* 风险等级 */}
      <span
        className={`text-[9px] px-1 py-0.5 rounded ${risk.bgColor} ${risk.color}`}
      >
        {risk.label}
      </span>

      {/* 决定 */}
      <span className={`text-[10px] ${decisionInfo.color}`}>
        {decisionInfo.label}
      </span>

      {/* 时间 */}
      <span className="text-[9px] text-zinc-600 font-mono">
        {formatTime(log.timestamp)}
      </span>
    </div>
  );
}

/* ── 辅助函数 ──────────────────────────────── */

function getDecisionInfo(decision: string): {
  icon: string;
  label: string;
  color: string;
} {
  switch (decision) {
    case "allow":
      return { icon: "v", label: "允许", color: "text-green-400" };
    case "deny":
      return { icon: "x", label: "拒绝", color: "text-red-400" };
    case "always_allow":
      return { icon: "V", label: "始终允许", color: "text-emerald-400" };
    default:
      return { icon: "?", label: decision, color: "text-zinc-500" };
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
