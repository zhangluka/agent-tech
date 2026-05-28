"use client";

import type { ExecuteResult } from "../engine/executor";

interface ExecutionPanelProps {
  results: ExecuteResult[];
  running: boolean;
  onRun: () => void;
  onClear: () => void;
}

/**
 * 执行面板 — 显示工作流执行结果
 */
export default function ExecutionPanel({
  results,
  running,
  onRun,
  onClear,
}: ExecutionPanelProps) {
  return (
    <div className="h-full flex flex-col">
      {/* 操作栏 */}
      <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
        <button
          onClick={onRun}
          disabled={running}
          className="px-3 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? "执行中..." : "运行"}
        </button>
        <button
          onClick={onClear}
          disabled={running}
          className="px-3 py-1.5 text-sm rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-50"
        >
          清空
        </button>
        {results.length > 0 && (
          <span className="text-zinc-500 text-xs ml-auto">
            {results.filter((r) => r.status === "done").length}/{results.length} 完成
          </span>
        )}
      </div>

      {/* 结果列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {results.length === 0 && (
          <p className="text-zinc-600 text-sm text-center mt-8">
            还没有执行结果
          </p>
        )}

        {results.map((r) => (
          <div
            key={r.nodeId}
            className="bg-zinc-800 border border-zinc-700 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <StatusDot status={r.status} />
              <span className="text-zinc-300 text-sm font-mono">{r.nodeId}</span>
              {r.duration !== undefined && (
                <span className="text-zinc-600 text-xs ml-auto">
                  {r.duration}ms
                </span>
              )}
            </div>

            {r.error && (
              <p className="text-red-400 text-xs mt-1">{r.error}</p>
            )}

            {r.output !== undefined && (
              <pre className="text-zinc-400 text-xs mt-2 bg-zinc-900 rounded p-2 overflow-x-auto max-h-[120px] overflow-y-auto">
                {typeof r.output === "string"
                  ? r.output
                  : JSON.stringify(r.output, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: "bg-zinc-600",
    running: "bg-amber-500 animate-pulse",
    done: "bg-emerald-500",
    error: "bg-red-500",
  };

  return (
    <span className={`w-2 h-2 rounded-full ${colors[status] || colors.idle}`} />
  );
}
