/**
 * Build An Agent - s13: 连线与执行
 *
 * Condition 节点：条件分支，根据表达式选择路径。
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

export default function ConditionNode({ node, status, selected, onMouseDown }: Props) {
  const expression = node.config.expression || "(未配置)";

  return (
    <BaseNode node={node} status={status} selected={selected} onMouseDown={onMouseDown}>
      <div className="truncate" title={expression}>{expression}</div>
      <div className="flex justify-between mt-1 text-[10px]">
        <span className="text-emerald-500">T →</span>
        <span className="text-red-500">← F</span>
      </div>
    </BaseNode>
  );
}
