"use client";

/**
 * Build An Agent - s16: 权限与确认
 *
 * 工作流画布。
 * 与 s15 基本相同，增加了 "denied" 状态的颜色处理。
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { WorkflowNode, NodeStatus } from "../engine/types";
import LLMNode from "./nodes/LLMNode";
import ToolNode from "./nodes/ToolNode";
import ConditionNode from "./nodes/ConditionNode";
import InputNode from "./nodes/InputNode";
import OutputNode from "./nodes/OutputNode";

/* ── 执行状态上下文 ────────────────────────── */

const NodeStatusContext = createContext<Map<string, NodeStatus>>(new Map());

export function useNodeStatus(nodeId: string): NodeStatus | undefined {
  const map = useContext(NodeStatusContext);
  return map.get(nodeId);
}

/* ── Canvas 组件 ───────────────────────────── */

interface CanvasProps {
  nodes: WorkflowNode[];
  edges: { id: string; source: string; target: string }[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  nodeStatuses: Map<string, NodeStatus>;
  onAddNode: (type: string, position: { x: number; y: number }) => void;
  onDeleteNode: (id: string) => void;
}

export default function Canvas({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  nodeStatuses,
  onAddNode,
  onDeleteNode,
}: CanvasProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const nodeType = e.dataTransfer.getData("nodeType");
      if (!nodeType) return;
      const rect = e.currentTarget.getBoundingClientRect();
      onAddNode(nodeType, {
        x: e.clientX - rect.left - 100,
        y: e.clientY - rect.top - 30,
      });
    },
    [onAddNode],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId) {
        onDeleteNode(selectedNodeId);
      }
    },
    [selectedNodeId, onDeleteNode],
  );

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <NodeStatusContext.Provider value={nodeStatuses}>
      <div
        className={`relative flex-1 overflow-auto ${
          dragOver ? "bg-zinc-800/50" : "bg-zinc-950"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        onClick={() => onSelectNode(null)}
      >
        {/* 网格背景 */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* SVG 连线层 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {edges.map((edge) => {
            const src = nodeMap.get(edge.source);
            const tgt = nodeMap.get(edge.target);
            if (!src || !tgt) return null;

            const x1 = src.position.x + 104;
            const y1 = src.position.y + 30;
            const x2 = tgt.position.x;
            const y2 = tgt.position.y + 30;
            const cx = (x1 + x2) / 2;

            // 边的颜色跟随源节点状态
            const srcStatus = nodeStatuses.get(edge.source);
            const stroke =
              srcStatus === "error" || srcStatus === "denied"
                ? "#ef4444"
                : srcStatus === "success"
                  ? "#22c55e"
                  : srcStatus === "running"
                    ? "#eab308"
                    : "#52525b";

            return (
              <path
                key={edge.id}
                d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                stroke={stroke}
                strokeWidth={2}
                fill="none"
              />
            );
          })}
        </svg>

        {/* 节点层 */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className="absolute"
            style={{ left: node.position.x, top: node.position.y }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode(node.id);
            }}
          >
            {renderNode(node, selectedNodeId === node.id)}
          </div>
        ))}

        {/* 空状态提示 */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
            <div className="text-center">
              <div className="text-4xl mb-3">+</div>
              <div className="text-sm">从左侧拖拽节点到画布</div>
            </div>
          </div>
        )}
      </div>
    </NodeStatusContext.Provider>
  );
}

function renderNode(node: WorkflowNode, selected: boolean) {
  const props = { node, selected, onSelect: () => {} };
  switch (node.type) {
    case "llm":
      return <LLMNode {...props} />;
    case "tool":
      return <ToolNode {...props} />;
    case "condition":
      return <ConditionNode {...props} />;
    case "input":
      return <InputNode {...props} />;
    case "output":
      return <OutputNode {...props} />;
    default:
      return null;
  }
}
