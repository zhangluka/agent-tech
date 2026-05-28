import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ConditionNodeData } from "../../types/nodeTypes";

const OPERATOR_LABELS: Record<ConditionNodeData["operator"], string> = {
  "==": "等于",
  "!=": "不等于",
  ">": "大于",
  "<": "小于",
  contains: "包含",
  exists: "存在",
};

function ConditionNode({
  data,
  selected,
}: NodeProps & { data: ConditionNodeData }) {
  return (
    <div
      className={`rounded-xl border-2 px-4 py-3 min-w-[200px] max-w-[240px] ${
        selected
          ? "border-yellow-400 bg-yellow-950 shadow-lg shadow-yellow-900/30"
          : "border-yellow-700 bg-zinc-900"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-yellow-500 !w-3 !h-3"
      />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-yellow-400 text-lg">⑂</span>
        <span className="text-yellow-300 font-semibold text-sm">
          {data.label}
        </span>
      </div>

      <div className="space-y-1 text-xs">
        <div className="text-zinc-400 font-mono">
          {data.variable}{" "}
          <span className="text-yellow-500">
            {OPERATOR_LABELS[data.operator]}
          </span>{" "}
          &quot;{data.value}&quot;
        </div>
      </div>

      {/* 双输出：左边是 true，右边是 false */}
      <div className="relative mt-3 flex justify-between px-2">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-green-400 mb-1">True</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!bg-green-500 !w-3 !h-3 !relative !translate-x-0 !translate-y-0"
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-red-400 mb-1">False</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!bg-red-500 !w-3 !h-3 !relative !translate-x-0 !translate-y-0"
          />
        </div>
      </div>
    </div>
  );
}

export default memo(ConditionNode);
