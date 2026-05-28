"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

export default function EndNode({ data }: NodeProps) {
  return (
    <div className="bg-red-600 text-white rounded-xl px-5 py-3 min-w-[140px] shadow-lg">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-red-300 !border-2 !border-red-800"
      />

      <div className="flex items-center gap-2">
        <span className="text-lg">⏹</span>
        <span className="font-semibold text-sm">{(data as { label: string }).label || "结束"}</span>
      </div>
    </div>
  );
}
