/**
 * Build An Agent - s13: 连线与执行
 *
 * 基础节点组件：所有节点类型的公共外壳。
 * 包含：标题、状态指示器、输入/输出端口。
 */

"use client";

import type { FlowNode, NodeStatus } from "../../engine/types";

/** 状态对应的边框颜色 */
const STATUS_BORDER: Record<NodeStatus, string> = {
  pending: "border-zinc-600",
  running: "border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]",
  completed: "border-emerald-500",
  error: "border-red-500",
};

/** 状态对应的指示灯颜色 */
const STATUS_DOT: Record<NodeStatus, string> = {
  pending: "bg-zinc-500",
  running: "bg-amber-400 animate-pulse",
  completed: "bg-emerald-500",
  error: "bg-red-500",
};

/** 节点类型对应的图标 */
const NODE_ICONS: Record<string, string> = {
  start: "▶",
  llm: "✦",
  tool: "⚙",
  condition: "◇",
  end: "■",
};

interface BaseNodeProps {
  node: FlowNode;
  status: NodeStatus;
  selected: boolean;
  children?: React.ReactNode;
  onMouseDown: (e: React.MouseEvent) => void;
}

export default function BaseNode({
  node,
  status,
  selected,
  children,
  onMouseDown,
}: BaseNodeProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={`
        absolute cursor-move select-none
        bg-zinc-800 rounded-lg border-2
        min-w-[160px] max-w-[220px]
        transition-all duration-200
        ${STATUS_BORDER[status]}
        ${selected ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-900" : ""}
      `}
      style={{ left: node.x, top: node.y }}
    >
      {/* 输入端口 */}
      {node.type !== "start" && (
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3
                        bg-zinc-700 border-2 border-zinc-500 rounded-full" />
      )}

      {/* 头部 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700">
        <span className="text-sm">{NODE_ICONS[node.type]}</span>
        <span className="text-xs font-medium text-zinc-200 truncate flex-1">
          {node.label}
        </span>
        <div className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
      </div>

      {/* 内容区 */}
      <div className="px-3 py-2 text-xs text-zinc-400">
        {children}
      </div>

      {/* 输出端口 */}
      {node.type !== "end" && (
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3
                        bg-zinc-700 border-2 border-zinc-500 rounded-full" />
      )}

      {/* 条件节点的两个输出端口 */}
      {node.type === "condition" && (
        <>
          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3
                          bg-emerald-600 border-2 border-emerald-400 rounded-full"
               title="true" />
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3
                          bg-red-600 border-2 border-red-400 rounded-full"
               title="false" />
        </>
      )}
    </div>
  );
}
