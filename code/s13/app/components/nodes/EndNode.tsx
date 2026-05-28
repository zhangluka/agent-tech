/**
 * Build An Agent - s13: 连线与执行
 *
 * End 节点：工作流的出口，收集最终输出。
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

export default function EndNode({ node, status, selected, onMouseDown }: Props) {
  const source = node.config.source || "全部输出";

  return (
    <BaseNode node={node} status={status} selected={selected} onMouseDown={onMouseDown}>
      <div className="truncate">来源: {source}</div>
    </BaseNode>
  );
}
