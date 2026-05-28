"use client";

/**
 * Build An Agent - s16: 权限与确认
 *
 * 确认对话框组件。
 * 当执行器遇到 moderate/dangerous 工具调用时弹出。
 * 显示工具名称、参数、风险等级，提供三个按钮：
 *   - 允许：本次放行
 *   - 拒绝：本次跳过
 *   - 始终允许：本次放行 + 后续同类工具不再弹窗
 */

import type { PendingConfirmation } from "../engine/types";
import { RISK_DISPLAY } from "../engine/permission";

interface Props {
  confirmation: PendingConfirmation;
  onAllow: () => void;
  onDeny: () => void;
  onAlwaysAllow: () => void;
}

export default function ConfirmationDialog({
  confirmation,
  onAllow,
  onDeny,
  onAlwaysAllow,
}: Props) {
  const risk = RISK_DISPLAY[confirmation.riskLevel];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 半透明背景 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* 对话框 */}
      <div className="relative w-[440px] rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* 顶部风险指示条 */}
        <div
          className={`h-1 rounded-t-xl ${
            confirmation.riskLevel === "dangerous"
              ? "bg-red-500"
              : confirmation.riskLevel === "moderate"
                ? "bg-yellow-500"
                : "bg-green-500"
          }`}
        />

        <div className="p-5">
          {/* 标题 */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${risk.bgColor} ${risk.color}`}
            >
              {confirmation.riskLevel === "dangerous" ? "!" : "?"}
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-100">
                工具调用确认
              </div>
              <div className="text-xs text-zinc-500">
                执行前需要你的许可
              </div>
            </div>
          </div>

          {/* 工具信息 */}
          <div className="space-y-3 mb-5">
            {/* 工具名 + 风险等级 */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-200 font-mono">
                {confirmation.toolName}
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${risk.bgColor} ${risk.color} ${risk.borderColor} border`}
              >
                {risk.label}
              </span>
            </div>

            {/* 参数预览 */}
            <div>
              <div className="text-[10px] text-zinc-500 mb-1">调用参数</div>
              <pre className="bg-zinc-800/80 rounded-lg p-2.5 text-xs text-zinc-300 overflow-auto max-h-32 border border-zinc-800">
                {formatArgs(confirmation.args)}
              </pre>
            </div>

            {/* 节点 ID */}
            <div className="text-[10px] text-zinc-600">
              来源节点: {confirmation.nodeId}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            {/* 拒绝 */}
            <button
              onClick={onDeny}
              className="flex-1 px-3 py-2 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              拒绝
            </button>

            {/* 允许 */}
            <button
              onClick={onAllow}
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-700 text-xs text-zinc-100 hover:bg-zinc-600 transition-colors"
            >
              允许
            </button>

            {/* 始终允许 */}
            <button
              onClick={onAlwaysAllow}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                confirmation.riskLevel === "dangerous"
                  ? "bg-red-600 text-red-100 hover:bg-red-500"
                  : "bg-emerald-600 text-emerald-100 hover:bg-emerald-500"
              }`}
            >
              始终允许
            </button>
          </div>

          {/* 底部提示 */}
          <div className="mt-3 text-[10px] text-zinc-600 text-center">
            "始终允许" 仅在本次会话生效，刷新页面后重置
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 辅助函数 ──────────────────────────────── */

function formatArgs(args: unknown): string {
  if (args === null || args === undefined) return "(无参数)";
  if (typeof args === "string") return args.slice(0, 300);
  const json = JSON.stringify(args, null, 2);
  return json.length > 500 ? json.slice(0, 500) + "..." : json;
}
