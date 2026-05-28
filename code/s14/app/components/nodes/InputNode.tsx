"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

/**
 * 输入节点 — 工作流的起点
 *
 * data.value: 用户输入的文本
 */
function InputNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`
        bg-zinc-800 border-2 rounded-lg p-3 min-w-[180px]
        ${selected ? "border-emerald-500" : "border-zinc-600"}
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-emerald-400 text-sm font-mono">IN</span>
        <span className="text-zinc-300 text-sm font-medium">
          {data.label || "输入"}
        </span>
      </div>

      <div className="text-zinc-400 text-xs truncate max-w-[160px]">
        {data.value || "（空）"}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500" />
    </div>
  );
}

export default memo(InputNode);
