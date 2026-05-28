"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

const MODELS = [
  { value: "deepseek-chat", label: "DeepSeek V3" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
];

export default function LLMNode({ data, selected }: NodeProps) {
  const nodeData = data as { label: string; model: string };
  const currentModel = nodeData.model || "deepseek-chat";

  return (
    <div
      className={`bg-blue-600 text-white rounded-xl px-5 py-3 min-w-[180px] shadow-lg
        ${selected ? "ring-2 ring-blue-300 ring-offset-2 ring-offset-zinc-900" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-300 !border-2 !border-blue-800"
      />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🧠</span>
        <span className="font-semibold text-sm">{nodeData.label || "LLM"}</span>
      </div>

      <select
        value={currentModel}
        onChange={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-blue-700 text-white text-xs rounded px-2 py-1
                   border border-blue-500 focus:outline-none focus:border-blue-300"
      >
        {MODELS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-300 !border-2 !border-blue-800"
      />
    </div>
  );
}
