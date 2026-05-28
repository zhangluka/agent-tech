import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { StartNodeData } from "../../types/nodeTypes";

function StartNode({ data, selected }: NodeProps & { data: StartNodeData }) {
  return (
    <div
      className={`rounded-xl border-2 px-4 py-3 min-w-[160px] ${
        selected
          ? "border-green-400 bg-green-950 shadow-lg shadow-green-900/30"
          : "border-green-700 bg-zinc-900"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-green-400 text-lg">▶</span>
        <span className="text-green-300 font-semibold text-sm">
          {data.label}
        </span>
      </div>
      <div className="text-xs text-zinc-500 font-mono">
        var: {data.variableName}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-green-500 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(StartNode);
