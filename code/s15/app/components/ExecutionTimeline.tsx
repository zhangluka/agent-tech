"use client";

/**
 * Build An Agent - s15: 执行日志
 *
 * 执行时间线组件。
 * 把一次运行的节点执行过程可视化为水平条形图。
 * 每个节点一行，横轴是时间，条的长度代表耗时。
 */

import { useState } from "react";
import type { ExecutionRun, NodeLog } from "../engine/types";

interface Props {
  run: ExecutionRun;
}

export default function ExecutionTimeline({ run }: Props) {
  const [selectedLog, setSelectedLog] = useState<NodeLog | null>(null);

  // 计算时间范围
  const startTime = run.startedAt;
  const endTime = run.finishedAt || Date.now();
  const totalDuration = endTime - startTime;

  if (totalDuration <= 0) return null;

  return (
    <div className="space-y-2">
      {/* 时间线条形图 */}
      <div className="space-y-1">
        {run.nodeLogs.map((log, i) => {
          const left = ((log.startedAt - startTime) / totalDuration) * 100;
          const width = Math.max(
            ((log.duration) / totalDuration) * 100,
            1, // 最小宽度 1%，保证可见
          );

          return (
            <div key={`${log.nodeId}-${i}`} className="flex items-center gap-2">
              {/* 节点标签 */}
              <div className="w-24 text-right">
                <span className="text-[10px] text-zinc-500 font-mono truncate block">
                  {log.nodeId.slice(0, 12)}
                </span>
              </div>

              {/* 条形图区域 */}
              <div className="flex-1 h-5 relative bg-zinc-800/30 rounded">
                <div
                  className={`absolute h-full rounded cursor-pointer transition-opacity hover:opacity-80 ${barColor(log.status)}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  onClick={() => setSelectedLog(log)}
                  title={`${log.nodeType} — ${log.duration}ms`}
                />
              </div>

              {/* 耗时 */}
              <div className="w-14 text-right">
                <span className="text-[10px] text-zinc-500 font-mono">
                  {formatDuration(log.duration)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 选中节点的详情 */}
      {selectedLog && (
        <div className="mt-2 p-2 bg-zinc-800/50 rounded border border-zinc-700 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusBadge status={selectedLog.status} />
              <span className="font-mono text-zinc-300">
                {selectedLog.nodeId}
              </span>
              <span className="text-zinc-500">({selectedLog.nodeType})</span>
            </div>
            <span className="text-zinc-500 font-mono">
              {formatDuration(selectedLog.duration)}
            </span>
          </div>

          {/* 输入 */}
          <div>
            <div className="text-zinc-500 mb-0.5">输入</div>
            <pre className="bg-zinc-900 rounded p-1.5 text-[11px] text-zinc-300 overflow-x-auto max-h-24">
              {formatData(selectedLog.input)}
            </pre>
          </div>

          {/* 输出或错误 */}
          {selectedLog.error ? (
            <div>
              <div className="text-red-400 mb-0.5">错误</div>
              <pre className="bg-red-950/30 rounded p-1.5 text-[11px] text-red-300 overflow-x-auto max-h-24">
                {selectedLog.error.message}
                {selectedLog.error.stack && `\n${selectedLog.error.stack}`}
              </pre>
            </div>
          ) : (
            <div>
              <div className="text-zinc-500 mb-0.5">输出</div>
              <pre className="bg-zinc-900 rounded p-1.5 text-[11px] text-zinc-300 overflow-x-auto max-h-24">
                {formatData(selectedLog.output)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 辅助函数 ──────────────────────────────── */

function barColor(status: string): string {
  switch (status) {
    case "success":
      return "bg-green-500/60";
    case "error":
      return "bg-red-500/60";
    case "running":
      return "bg-yellow-500/60 animate-pulse";
    case "skipped":
      return "bg-zinc-600/40";
    default:
      return "bg-zinc-700/40";
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatData(data: unknown): string {
  if (data === null || data === undefined) return "(空)";
  if (typeof data === "string") {
    return data.length > 300 ? data.slice(0, 300) + "..." : data;
  }
  const json = JSON.stringify(data, null, 2);
  return json.length > 500 ? json.slice(0, 500) + "..." : json;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    pending: { label: "等待", color: "bg-zinc-600 text-zinc-300" },
    running: { label: "执行中", color: "bg-yellow-600 text-yellow-100" },
    success: { label: "成功", color: "bg-green-700 text-green-100" },
    error: { label: "失败", color: "bg-red-700 text-red-100" },
    skipped: { label: "跳过", color: "bg-zinc-700 text-zinc-400" },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.color}`}>
      {c.label}
    </span>
  );
}
