"use client";

/**
 * Build An Agent - s16: 权限与确认
 *
 * LLM 节点组件。
 * （与 s15 相同）
 */

import type { WorkflowNode } from "../../engine/types";
import { useNodeStatus } from "../Canvas";

interface Props {
  node: WorkflowNode;
  selected: boolean;
  onSelect: () => void;
}

export default function LLMNode({ node, selected, onSelect }: Props) {
  const status = useNodeStatus(node.id);
  const model = (node.data.model as string) || "deepseek-chat";

  return (
    <div
      onClick={onSelect}
      className={`
        w-52 rounded-lg border bg-zinc-900 cursor-pointer transition-all
        ${selected ? "border-white ring-1 ring-white/20" : "border-zinc-700 hover:border-zinc-500"}
      `}
    >
      <div className="h-1 rounded-t-lg bg-violet-500" />
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          {status && <StatusDot status={status} />}
          <span className="text-xs font-medium text-violet-400">LLM</span>
        </div>
        <div className="text-sm text-zinc-200 truncate">
          {(node.data.label as string) || "LLM 节点"}
        </div>
        <div className="text-xs text-zinc-500 mt-1">{model}</div>
      </div>
      <div className="absolute -left-1.5 top-1/2 w-3 h-3 rounded-full bg-zinc-700 border-2 border-zinc-900" />
      <div className="absolute -right-1.5 top-1/2 w-3 h-3 rounded-full bg-zinc-700 border-2 border-zinc-900" />
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "running"
      ? "bg-yellow-400 animate-pulse"
      : status === "success"
        ? "bg-green-400"
        : status === "error"
          ? "bg-red-400"
          : status === "skipped"
            ? "bg-zinc-500"
            : "bg-zinc-600";
  return <div className={`w-2 h-2 rounded-full ${color}`} />;
}
