"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

/**
 * 输出节点 — 工作流的终点
 *
 * 接收上游结果，显示在面板里。
 */
function OutputNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`
        bg-zinc-800 border-2 rounded-lg p-3 min-w-[180px]
        ${selected ? "border-rose-500" : "border-zinc-600"}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-500" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-rose-400 text-sm font-mono">OUT</span>
        <span className="text-zinc-300 text-sm font-medium">
          {data.label || "输出"}
        </span>
      </div>

      {data.result && (
        <div className="text-zinc-400 text-xs truncate max-w-[160px]">
          {String(data.result).slice(0, 60)}
        </div>
      )}
    </div>
  );
}

export default memo(OutputNode);
