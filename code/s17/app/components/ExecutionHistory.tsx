/**
 * Build An Agent - s17: 错误恢复
 *
 * 执行历史列表组件。
 * 在 s15 基础上增加了回滚标记和重试统计。
 */

"use client";

import type { ExecutionRun } from "../engine/types";
import { exportExecutionLog } from "../utils/workflowIO";

interface Props {
  runs: ExecutionRun[];
  activeRunId: string | null;
  onSelectRun: (id: string) => void;
  onDeleteRun: (id: string) => void;
}

export default function ExecutionHistory({
  runs,
  activeRunId,
  onSelectRun,
  onDeleteRun,
}: Props) {
  if (runs.length === 0) {
    return (
      <div className="text-xs text-zinc-600 text-center py-8">
        暂无执行记录
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {runs.map((run) => {
        const totalRetries = run.nodeLogs.reduce(
          (sum, log) => sum + log.retryCount,
          0,
        );

        return (
          <div
            key={run.id}
            className={`
              group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors
              ${activeRunId === run.id ? "bg-zinc-700/50 border border-zinc-600" : "hover:bg-zinc-800/50 border border-transparent"}
            `}
            onClick={() => onSelectRun(run.id)}
          >
            {/* 状态点 */}
            <div className={`w-1.5 h-1.5 rounded-full ${statusDotColor(run.status)}`} />

            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-zinc-500">
                  {formatTime(run.startedAt)}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {run.workflowName}
                </span>
                {run.rolledBack && (
                  <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1 rounded">
                    回滚
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] ${statusTextColor(run.status)}`}>
                  {statusLabel(run.status)}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {run.nodeLogs.length} 节点
                </span>
                {totalRetries > 0 && (
                  <span className="text-[10px] text-orange-400/60">
                    {totalRetries} 次重试
                  </span>
                )}
                <span className="text-[10px] text-zinc-600">
                  {formatDuration(run.duration)}
                </span>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  exportExecutionLog(run);
                }}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1"
                title="导出 JSON"
              >
                {">"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRun(run.id);
                }}
                className="text-[10px] text-zinc-500 hover:text-red-400 px-1"
                title="删除"
              >
                x
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── 辅助函数 ──────────────────────────────── */

function statusDotColor(status: string): string {
  switch (status) {
    case "success":
      return "bg-green-400";
    case "error":
      return "bg-red-400";
    case "running":
      return "bg-yellow-400 animate-pulse";
    case "rolled_back":
      return "bg-amber-400";
    default:
      return "bg-zinc-500";
  }
}

function statusTextColor(status: string): string {
  switch (status) {
    case "success":
      return "text-green-400";
    case "error":
      return "text-red-400";
    case "running":
      return "text-yellow-400";
    case "rolled_back":
      return "text-amber-400";
    default:
      return "text-zinc-500";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "success":
      return "成功";
    case "error":
      return "失败";
    case "running":
      return "运行中";
    case "cancelled":
      return "已取消";
    case "rolled_back":
      return "已回滚";
    default:
      return status;
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m${s}s`;
}
