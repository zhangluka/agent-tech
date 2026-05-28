"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

/**
 * 转换节点 — 对上游输出做文本变换
 *
 * data.template: 模板字符串，{{input}} 会被替换为上游输出
 */
function TransformNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`
        bg-zinc-800 border-2 rounded-lg p-3 min-w-[180px]
        ${selected ? "border-amber-500" : "border-zinc-600"}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-500" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-400 text-sm font-mono">TPL</span>
        <span className="text-zinc-300 text-sm font-medium">
          {data.label || "转换"}
        </span>
      </div>

      <div className="text-zinc-400 text-xs truncate max-w-[160px]">
        {data.template || "透传"}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
    </div>
  );
}

export default memo(TransformNode);
