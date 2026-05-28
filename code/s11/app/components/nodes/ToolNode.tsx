"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

export default function ToolNode({ data }: NodeProps) {
  const nodeData = data as { label: string; toolName: string };
  return (
    <div className="bg-orange-600 text-white rounded-xl px-5 py-3 min-w-[140px] shadow-lg">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-orange-300 !border-2 !border-orange-800"
      />

      <div className="flex items-center gap-2">
        <span className="text-lg">🔧</span>
        <span className="font-semibold text-sm">{nodeData.label || "工具"}</span>
      </div>

      {nodeData.toolName && (
        <div className="text-xs text-orange-200 mt-1">{nodeData.toolName}</div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-orange-300 !border-2 !border-orange-800"
      />
    </div>
  );
}
