"use client";

/**
 * Build An Agent - s10: 调用可视化
 *
 * 工具调用卡片组件。
 * 可折叠，显示工具名、参数、结果和执行状态。
 */

import { useState } from "react";
import type { ToolCall } from "../store/chatStore";

interface ToolCallCardProps {
  toolCall: ToolCall;
}

export default function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = toolCall.status === "pending" ? "⏳" : "✅";
  const statusColor =
    toolCall.status === "pending"
      ? "border-yellow-600/40 bg-yellow-950/20"
      : "border-zinc-700 bg-zinc-900/50";
  const chevron = expanded ? "▲" : "▼";

  return (
    <div
      className={`rounded-lg border ${statusColor} my-2 overflow-hidden text-sm`}
    >
      {/* 头部：可点击展开/折叠 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-zinc-800/50 transition-colors text-left"
      >
        <span className="text-base">{statusIcon}</span>
        <span className="font-mono font-medium text-zinc-200">
          {toolCall.name}
        </span>
        <span className="text-zinc-500 text-xs">
          ({formatArgs(toolCall.args)})
        </span>
        <span className="ml-auto text-zinc-600 text-xs">{chevron}</span>
      </button>

      {/* 展开区域：参数 + 结果 */}
      {expanded && (
        <div className="border-t border-zinc-800 px-3 py-2 space-y-3">
          {/* 参数 */}
          <div>
            <div className="text-xs text-zinc-500 mb-1">参数</div>
            <pre className="bg-zinc-950 rounded p-2 text-xs text-zinc-300 overflow-x-auto max-h-40">
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>

          {/* 结果 */}
          {toolCall.result !== undefined && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">结果</div>
              <pre className="bg-zinc-950 rounded p-2 text-xs text-zinc-300 overflow-x-auto max-h-60 whitespace-pre-wrap break-all">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 把参数对象压缩成一行简短摘要，显示在头部。
 * 例：{ "path": "package.json" } → "path: package.json"
 */
function formatArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([k, v]) => {
      const val = typeof v === "string" ? v : JSON.stringify(v);
      return `${k}: ${val}`;
    })
    .join(", ");
}
