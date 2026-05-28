/**
 * Build An Agent - s13: 连线与执行
 *
 * LLM 节点：调用大语言模型。
 */

"use client";

import BaseNode from "./BaseNode";
import type { FlowNode, NodeStatus } from "../../engine/types";

interface Props {
  node: FlowNode;
  status: NodeStatus;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

export default function LLMNode({ node, status, selected, onMouseDown }: Props) {
  const model = node.config.model || "deepseek-chat";
  const prompt = node.config.prompt || "(未配置)";

  return (
    <BaseNode node={node} status={status} selected={selected} onMouseDown={onMouseDown}>
      <div className="text-zinc-500 mb-1">{model}</div>
      <div className="truncate" title={prompt}>{prompt}</div>
    </BaseNode>
  );
}
