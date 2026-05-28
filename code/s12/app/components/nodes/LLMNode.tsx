import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { LLMNodeData } from "../../types/nodeTypes";
import { MODELS } from "../../types/nodeTypes";

function LLMNode({ data, selected }: NodeProps & { data: LLMNodeData }) {
  const model = MODELS.find((m) => m.id === data.model);

  return (
    <div
      className={`rounded-xl border-2 px-4 py-3 min-w-[200px] max-w-[240px] ${
        selected
          ? "border-purple-400 bg-purple-950 shadow-lg shadow-purple-900/30"
          : "border-purple-700 bg-zinc-900"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-purple-500 !w-3 !h-3"
      />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-purple-400 text-lg">🧠</span>
        <span className="text-purple-300 font-semibold text-sm">
          {data.label}
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">模型</span>
          <span className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded">
            {model?.label ?? data.model}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">温度</span>
          <span className="text-zinc-300">{data.temperature}</span>
        </div>
        {data.systemPrompt && (
          <div className="text-zinc-500 truncate" title={data.systemPrompt}>
            prompt: {data.systemPrompt.slice(0, 30)}
            {data.systemPrompt.length > 30 ? "..." : ""}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-purple-500 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(LLMNode);
