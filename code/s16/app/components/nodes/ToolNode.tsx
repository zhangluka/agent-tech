"use client";

/**
 * Build An Agent - s16: 权限与确认
 *
 * Tool 节点组件。
 * 在 s15 基础上增加了风险等级徽标：
 *   - safe: 绿色小圆点
 *   - moderate: 黄色三角
 *   - dangerous: 红色菱形
 */

import type { WorkflowNode } from "../../engine/types";
import { useNodeStatus } from "../Canvas";
import { getRiskLevel, RISK_DISPLAY } from "../../engine/permission";

interface Props {
  node: WorkflowNode;
  selected: boolean;
  onSelect: () => void;
}

export default function ToolNode({ node, selected, onSelect }: Props) {
  const status = useNodeStatus(node.id);
  const tool = (node.data.tool as string) || "unknown";
  const riskLevel = getRiskLevel(tool);
  const riskDisplay = RISK_DISPLAY[riskLevel];

  return (
    <div
      onClick={onSelect}
      className={`
        w-52 rounded-lg border bg-zinc-900 cursor-pointer transition-all
        ${selected ? "border-white ring-1 ring-white/20" : "border-zinc-700 hover:border-zinc-500"}
      `}
    >
      <div className="h-1 rounded-t-lg bg-emerald-500" />
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          {status && <StatusDot status={status} />}
          <span className="text-xs font-medium text-emerald-400">Tool</span>
          {/* s16: 风险等级徽标 */}
          <RiskBadge level={riskLevel} display={riskDisplay} />
        </div>
        <div className="text-sm text-zinc-200 truncate">
          {(node.data.label as string) || tool}
        </div>
        <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
          <span>{tool}</span>
          {/* 风险等级文字 */}
          <span className={`text-[9px] ${riskDisplay.color}`}>
            {riskDisplay.label}
          </span>
        </div>
      </div>
      <div className="absolute -left-1.5 top-1/2 w-3 h-3 rounded-full bg-zinc-700 border-2 border-zinc-900" />
      <div className="absolute -right-1.5 top-1/2 w-3 h-3 rounded-full bg-zinc-700 border-2 border-zinc-900" />
    </div>
  );
}

/* ── 风险等级徽标 ──────────────────────────── */

function RiskBadge({
  level,
  display,
}: {
  level: string;
  display: { color: string; bgColor: string };
}) {
  // 不在工具节点上显示 safe 的徽标——默认就是安全的
  if (level === "safe") return null;

  return (
    <span
      className={`
        ml-auto text-[9px] px-1 py-0.5 rounded font-medium
        ${display.bgColor} ${display.color}
      `}
    >
      {level === "dangerous" ? "危险" : "注意"}
    </span>
  );
}

/* ── 执行状态点 ────────────────────────────── */

function StatusDot({ status }: { status: string }) {
  const color =
    status === "running"
      ? "bg-yellow-400 animate-pulse"
      : status === "success"
        ? "bg-green-400"
        : status === "error"
          ? "bg-red-400"
          : status === "denied"
            ? "bg-orange-400"
            : status === "skipped"
              ? "bg-zinc-500"
              : "bg-zinc-600";
  return <div className={`w-2 h-2 rounded-full ${color}`} />;
}
