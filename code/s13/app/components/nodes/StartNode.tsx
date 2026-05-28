/**
 * Build An Agent - s13: 连线与执行
 *
 * Start 节点：工作流的入口，初始化上下文变量。
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

export default function StartNode({ node, status, selected, onMouseDown }: Props) {
  const variables = node.config.variables || "{}";
  let preview = variables;
  try {
    const parsed = JSON.parse(variables);
    preview = Object.keys(parsed).join(", ");
  } catch {
    // 保持原样
  }

  return (
    <BaseNode node={node} status={status} selected={selected} onMouseDown={onMouseDown}>
      <div className="truncate" title={variables}>
        {preview === "{}" ? "无变量" : preview}
      </div>
    </BaseNode>
  );
}
