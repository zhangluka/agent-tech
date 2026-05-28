"use client";

/**
 * Build An Agent - s16: 权限与确认
 *
 * 执行面板组件（右侧面板）。
 * 在 s15 基础上增加了"权限"标签页。
 */

import { useState } from "react";
import type { ExecutionRun, NodeLog, PermissionLog as PermissionLogEntry } from "../engine/types";
import ExecutionTimeline from "./ExecutionTimeline";
import ExecutionHistory from "./ExecutionHistory";
import PermissionLog from "./PermissionLog";

interface Props {
  currentRun: ExecutionRun | null;
  historyRuns: ExecutionRun[];
  activeRunId: string | null;
  permissionLogs: PermissionLogEntry[];
  onSelectRun: (id: string) => void;
  onDeleteRun: (id: string) => void;
}

type Tab = "live" | "history" | "detail" | "permissions";

export default function ExecutionPanel({
  currentRun,
  historyRuns,
  activeRunId,
  permissionLogs,
  onSelectRun,
  onDeleteRun,
}: Props) {
  const [tab, setTab] = useState<Tab>("live");
  const [selectedLog, setSelectedLog] = useState<NodeLog | null>(null);

  const displayRun =
    tab === "live"
      ? currentRun
      : historyRuns.find((r) => r.id === activeRunId) ?? null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "live", label: "实时" },
    { key: "history", label: "历史" },
    { key: "detail", label: "详情" },
    { key: "permissions", label: "权限" },
  ];

  return (
    <div className="w-80 border-l border-zinc-800 bg-zinc-900 flex flex-col h-full">
      {/* 标签栏 */}
      <div className="flex border-b border-zinc-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === t.key
                ? "text-zinc-100 border-b-2 border-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
            {/* 权限标签页显示待确认数量 */}
            {t.key === "permissions" && permissionLogs.length > 0 && (
              <span className="ml-1 text-[9px] text-zinc-500">
                ({permissionLogs.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "live" && <LiveTab run={currentRun} />}

        {tab === "history" && (
          <ExecutionHistory
            runs={historyRuns}
            activeRunId={activeRunId}
            onSelectRun={onSelectRun}
            onDeleteRun={onDeleteRun}
          />
        )}

        {tab === "detail" && (
          <DetailTab
            run={displayRun}
            selectedLog={selectedLog}
            onSelectLog={setSelectedLog}
          />
        )}

        {tab === "permissions" && <PermissionLog logs={permissionLogs} />}
      </div>
    </div>
  );
}

/* ── 实时标签页 ────────────────────────────── */

function LiveTab({ run }: { run: ExecutionRun | null }) {
  if (!run) {
    return (
      <div className="text-xs text-zinc-600 text-center py-8">
        点击"运行"执行工作流
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${run.status === "running" ? "bg-yellow-400 animate-pulse" : run.status === "success" ? "bg-green-400" : "bg-red-400"}`} />
        <span className="text-xs text-zinc-300">
          {run.status === "running" ? "执行中..." : run.status === "success" ? "执行完成" : "执行失败"}
        </span>
        {run.status !== "running" && (
          <span className="text-[10px] text-zinc-500 ml-auto font-mono">
            {run.duration < 1000 ? `${run.duration}ms` : `${(run.duration / 1000).toFixed(1)}s`}
          </span>
        )}
      </div>

      <div className="space-y-1">
        {run.nodeLogs.map((log, i) => (
          <div
            key={`${log.nodeId}-${i}`}
            className="flex items-center gap-2 text-xs"
          >
            <StatusIcon status={log.status} />
            <span className="text-zinc-400 font-mono truncate">
              {log.nodeType}
            </span>
            <span className="text-zinc-600 truncate flex-1">
              {log.nodeId.slice(0, 16)}
            </span>
            <span className="text-zinc-600 font-mono">
              {log.duration > 0 ? `${log.duration}ms` : "-"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 详情标签页 ────────────────────────────── */

function DetailTab({
  run,
  selectedLog,
  onSelectLog,
}: {
  run: ExecutionRun | null;
  selectedLog: NodeLog | null;
  onSelectLog: (log: NodeLog) => void;
}) {
  if (!run) {
    return (
      <div className="text-xs text-zinc-600 text-center py-8">
        选择一次运行查看详情
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-zinc-500 mb-1">时间线</div>
      <ExecutionTimeline run={run} />

      <div className="text-xs text-zinc-500 mt-3 mb-1">节点日志</div>
      <div className="space-y-1">
        {run.nodeLogs.map((log, i) => (
          <button
            key={`${log.nodeId}-${i}`}
            onClick={() => onSelectLog(log)}
            className={`
              w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-left transition-colors
              ${selectedLog?.nodeId === log.nodeId ? "bg-zinc-700/50" : "hover:bg-zinc-800/50"}
            `}
          >
            <StatusIcon status={log.status} />
            <span className="font-mono text-zinc-300">{log.nodeType}</span>
            <span className="text-zinc-500 flex-1 truncate">{log.nodeId}</span>
            <span className="text-zinc-600 font-mono">
              {log.duration > 0 ? `${log.duration}ms` : "-"}
            </span>
          </button>
        ))}
      </div>

      {selectedLog && <NodeLogDetail log={selectedLog} />}
    </div>
  );
}

/* ── 节点日志详情 ──────────────────────────── */

function NodeLogDetail({ log }: { log: NodeLog }) {
  return (
    <div className="mt-2 p-2 bg-zinc-800/50 rounded border border-zinc-700 space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <StatusIcon status={log.status} />
        <span className="font-mono text-zinc-200">{log.nodeId}</span>
        <span className="text-zinc-500">({log.nodeType})</span>
        <span className="text-zinc-600 font-mono ml-auto">
          {log.duration}ms
        </span>
      </div>

      <div>
        <div className="text-[10px] text-zinc-500 mb-0.5">输入</div>
        <pre className="bg-zinc-900 rounded p-1.5 text-[11px] text-zinc-300 overflow-x-auto max-h-32">
          {formatJson(log.input)}
        </pre>
      </div>

      {log.error ? (
        <div>
          <div className="text-[10px] text-red-400 mb-0.5">错误</div>
          <pre className="bg-red-950/30 rounded p-1.5 text-[11px] text-red-300 overflow-x-auto max-h-32 whitespace-pre-wrap">
            {log.error.message}
            {log.error.stack && `\n\n${log.error.stack}`}
          </pre>
        </div>
      ) : (
        <div>
          <div className="text-[10px] text-zinc-500 mb-0.5">输出</div>
          <pre className="bg-zinc-900 rounded p-1.5 text-[11px] text-zinc-300 overflow-x-auto max-h-32">
            {formatJson(log.output)}
          </pre>
        </div>
      )}

      <div className="text-[10px] text-zinc-600 flex gap-4">
        <span>开始: {new Date(log.startedAt).toLocaleTimeString()}</span>
        <span>结束: {new Date(log.finishedAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

/* ── 通用组件 ──────────────────────────────── */

function StatusIcon({ status }: { status: string }) {
  const config: Record<string, { icon: string; color: string }> = {
    pending: { icon: "o", color: "text-zinc-500" },
    running: { icon: ">", color: "text-yellow-400 animate-pulse" },
    success: { icon: "v", color: "text-green-400" },
    error: { icon: "x", color: "text-red-400" },
    denied: { icon: "!", color: "text-orange-400" },
    skipped: { icon: "-", color: "text-zinc-600" },
  };
  const c = config[status] || config.pending;
  return <span className={`text-xs font-mono ${c.color}`}>{c.icon}</span>;
}

function formatJson(data: unknown): string {
  if (data === null || data === undefined) return "(空)";
  if (typeof data === "string") return data.slice(0, 500);
  const json = JSON.stringify(data, null, 2);
  return json.length > 500 ? json.slice(0, 500) + "..." : json;
}
