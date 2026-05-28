/**
 * Build An Agent - s13: 连线与执行
 *
 * 执行面板：显示执行日志、当前步骤、节点输出。
 */

"use client";

import { useWorkflowStore, type ExecutionLog } from "../store/workflowStore";

/** 日志条目的颜色 */
const LOG_COLORS: Record<ExecutionLog["type"], string> = {
  info: "text-zinc-400",
  success: "text-emerald-400",
  error: "text-red-400",
  warning: "text-amber-400",
};

/** 日志条目的图标 */
const LOG_ICONS: Record<ExecutionLog["type"], string> = {
  info: "○",
  success: "●",
  error: "✕",
  warning: "△",
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function ExecutionPanel() {
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const logs = useWorkflowStore((s) => s.executionLogs);
  const nodeOutputs = useWorkflowStore((s) => s.nodeOutputs);
  const currentNodeId = useWorkflowStore((s) => s.currentNodeId);
  const nodes = useWorkflowStore((s) => s.nodes);
  const expandedOutput = useWorkflowStore((s) => s.expandedOutput);
  const setExpandedOutput = useWorkflowStore((s) => s.setExpandedOutput);

  const currentNode = nodes.find((n) => n.id === currentNodeId);

  return (
    <div className="h-full flex flex-col">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
        <span className="text-sm font-medium">执行日志</span>
        {isRunning && (
          <span className="text-xs text-amber-400 animate-pulse">执行中...</span>
        )}
      </div>

      {/* 当前执行节点 */}
      {currentNode && (
        <div className="px-4 py-2 bg-zinc-800/50 border-b border-zinc-700">
          <span className="text-xs text-zinc-500">当前节点</span>
          <div className="text-sm text-amber-400 mt-0.5">{currentNode.label}</div>
        </div>
      )}

      {/* 日志列表 */}
      <div className="flex-1 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
            {isRunning ? "等待执行..." : "点击「运行」执行工作流"}
          </div>
        ) : (
          <div className="p-3 space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="text-xs font-mono leading-relaxed">
                <span className="text-zinc-600">{formatTime(log.timestamp)}</span>
                <span className={`mx-1.5 ${LOG_COLORS[log.type]}`}>
                  {LOG_ICONS[log.type]}
                </span>
                <span className="text-zinc-500">[{log.nodeLabel}]</span>
                <span className={`ml-1 ${LOG_COLORS[log.type]}`}>{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 节点输出区 */}
      {Object.keys(nodeOutputs).length > 0 && (
        <div className="border-t border-zinc-700">
          <div className="px-4 py-2 text-xs text-zinc-500 font-medium">节点输出</div>
          <div className="max-h-48 overflow-y-auto">
            {Object.entries(nodeOutputs).map(([nodeId, output]) => {
              const node = nodes.find((n) => n.id === nodeId);
              const isExpanded = expandedOutput === nodeId;

              return (
                <div key={nodeId} className="border-t border-zinc-800">
                  <button
                    onClick={() => setExpandedOutput(isExpanded ? null : nodeId)}
                    className="w-full px-4 py-1.5 flex items-center justify-between
                               hover:bg-zinc-800/50 text-xs"
                  >
                    <span className="text-zinc-400">
                      {node?.label || nodeId}
                    </span>
                    <span className="text-zinc-600">{isExpanded ? "▲" : "▼"}</span>
                  </button>
                  {isExpanded && (
                    <pre className="px-4 py-2 text-xs text-zinc-300 bg-zinc-900/50
                                    whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                      {output}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
