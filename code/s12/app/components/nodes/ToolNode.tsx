import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ToolNodeData } from "../../types/nodeTypes";
import { TOOLS } from "../../types/nodeTypes";

function ToolNode({ data, selected }: NodeProps & { data: ToolNodeData }) {
  const tool = TOOLS.find((t) => t.name === data.toolName);
  const argEntries = Object.entries(data.args);

  return (
    <div
      className={`rounded-xl border-2 px-4 py-3 min-w-[200px] max-w-[240px] ${
        selected
          ? "border-amber-400 bg-amber-950 shadow-lg shadow-amber-900/30"
          : "border-amber-700 bg-zinc-900"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-amber-500 !w-3 !h-3"
      />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-400 text-lg">🔧</span>
        <span className="text-amber-300 font-semibold text-sm">
          {data.label}
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">工具</span>
          <span className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded">
            {tool?.label ?? data.toolName}
          </span>
        </div>
        {argEntries.length > 0 && (
          <div className="text-zinc-500">
            {argEntries.map(([k, v]) => (
              <div key={k} className="truncate">
                {k}: <span className="text-zinc-400">{v || "(空)"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-amber-500 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(ToolNode);
