"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

export default function StartNode({ data }: NodeProps) {
  return (
    <div className="bg-emerald-600 text-white rounded-xl px-5 py-3 min-w-[140px] shadow-lg">
      <div className="flex items-center gap-2">
        <span className="text-lg">▶</span>
        <span className="font-semibold text-sm">{(data as { label: string }).label || "开始"}</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-emerald-300 !border-2 !border-emerald-800"
      />
    </div>
  );
}
