"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

/**
 * LLM 节点 — 调用大模型
 *
 * data.model:  模型名称
 * data.prompt: 提示词（可选，也可从上游输入）
 */
function LlmNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`
        bg-zinc-800 border-2 rounded-lg p-3 min-w-[180px]
        ${selected ? "border-violet-500" : "border-zinc-600"}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-500" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-violet-400 text-sm font-mono">LLM</span>
        <span className="text-zinc-300 text-sm font-medium">
          {data.label || "大模型"}
        </span>
      </div>

      <div className="text-zinc-500 text-xs font-mono">
        {data.model || "deepseek-chat"}
      </div>

      {data.prompt && (
        <div className="text-zinc-400 text-xs mt-1 truncate max-w-[160px]">
          {data.prompt}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-violet-500" />
    </div>
  );
}

export default memo(LlmNode);
