"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

/**
 * 条件节点 — 根据条件走不同分支
 *
 * data.condition: equals | contains | truthy | gt | lt
 * data.target:    比较目标值
 */
function ConditionNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`
        bg-zinc-800 border-2 rounded-lg p-3 min-w-[180px]
        ${selected ? "border-sky-500" : "border-zinc-600"}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-500" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-sky-400 text-sm font-mono">IF</span>
        <span className="text-zinc-300 text-sm font-medium">
          {data.label || "条件"}
        </span>
      </div>

      <div className="text-zinc-400 text-xs">
        {data.condition || "truthy"} {data.target ? `→ ${data.target}` : ""}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!bg-emerald-500"
        style={{ left: "30%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!bg-red-500"
        style={{ left: "70%" }}
      />
    </div>
  );
}

export default memo(ConditionNode);
