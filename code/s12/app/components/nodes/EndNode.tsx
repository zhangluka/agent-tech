import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { EndNodeData } from "../../types/nodeTypes";

const FORMAT_LABELS: Record<EndNodeData["outputFormat"], string> = {
  text: "纯文本",
  json: "JSON",
  markdown: "Markdown",
};

function EndNode({ data, selected }: NodeProps & { data: EndNodeData }) {
  return (
    <div
      className={`rounded-xl border-2 px-4 py-3 min-w-[160px] ${
        selected
          ? "border-red-400 bg-red-950 shadow-lg shadow-red-900/30"
          : "border-red-700 bg-zinc-900"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-red-500 !w-3 !h-3"
      />

      <div className="flex items-center gap-2 mb-1">
        <span className="text-red-400 text-lg">■</span>
        <span className="text-red-300 font-semibold text-sm">{data.label}</span>
      </div>
      <div className="text-xs text-zinc-500">
        输出: {FORMAT_LABELS[data.outputFormat]}
      </div>
    </div>
  );
}

export default memo(EndNode);
