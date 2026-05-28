/**
 * Build An Agent - s13: 连线与执行
 *
 * Tool 节点：执行一个工具。
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

export default function ToolNode({ node, status, selected, onMouseDown }: Props) {
  const toolName = node.config.tool_name || "(未配置)";

  return (
    <BaseNode node={node} status={status} selected={selected} onMouseDown={onMouseDown}>
      <div className="font-mono">{toolName}</div>
    </BaseNode>
  );
}
