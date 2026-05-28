/**
 * Build An Agent - s17: 错误恢复
 *
 * 条件节点组件。
 */

"use client";

import type { WorkflowNode } from "../../engine/types";
import { useNodeStatus } from "../Canvas";

interface Props {
  node: WorkflowNode;
  selected: boolean;
  onSelect: () => void;
}

export default function ConditionNode({ node, selected, onSelect }: Props) {
  const status = useNodeStatus(node.id);
  const condition = (node.data.condition as string) || "";

  const borderColor = selected
    ? "border-white ring-1 ring-white/20"
    : status === "error"
      ? "border-red-500 ring-1 ring-red-500/30"
      : status === "success"
        ? "border-green-500/30"
        : "border-zinc-700 hover:border-zinc-500";

  return (
    <div
      onClick={onSelect}
      className={`
        w-52 rounded-lg border bg-zinc-900 cursor-pointer transition-all
        ${borderColor}
        ${status === "error" ? "animate-errorShake" : ""}
      `}
    >
      <div className={`h-1 rounded-t-lg ${status === "error" ? "bg-red-500" : "bg-amber-500"}`} />

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <StatusDot status={status} />
          <span className="text-xs font-medium text-amber-400">Condition</span>
        </div>
        <div className="text-sm text-zinc-200 truncate">
          {(node.data.label as string) || "条件节点"}
        </div>
        {condition && (
          <div className="text-xs text-zinc-500 mt-1 truncate">{condition}</div>
        )}
      </div>

      <div className="absolute -left-1.5 top-1/2 w-3 h-3 rounded-full bg-zinc-700 border-2 border-zinc-900" />
      <div className="absolute -right-1.5 top-1/2 w-3 h-3 rounded-full bg-zinc-700 border-2 border-zinc-900" />
    </div>
  );
}

function StatusDot({ status }: { status?: string }) {
  if (!status || status === "pending") return null;
  const color =
    status === "running"
      ? "bg-yellow-400 animate-pulse"
      : status === "success"
        ? "bg-green-400"
        : status === "error"
          ? "bg-red-400 animate-pulse"
          : status === "skipped"
            ? "bg-zinc-500"
            : "bg-zinc-600";
  return <div className={`w-2 h-2 rounded-full ${color}`} />;
}
