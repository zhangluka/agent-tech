/**
 * Build An Agent - s17: 错误恢复
 *
 * 工作流画布。
 * 在 s15 基础上增强了错误状态可视化：
 *   - 失败节点显示红色边框 + 闪烁
 *   - 重试中的节点显示黄色脉冲
 *   - 回滚后已重置的节点显示灰色虚线边框
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { WorkflowNode, NodeStatus, NodeLog } from "../engine/types";
import LLMNode from "./nodes/LLMNode";
import ToolNode from "./nodes/ToolNode";
import ConditionNode from "./nodes/ConditionNode";
import InputNode from "./nodes/InputNode";
import OutputNode from "./nodes/OutputNode";

/* ── 执行状态上下文 ────────────────────────── */

const NodeStatusContext = createContext<Map<string, NodeStatus>>(new Map());
const NodeRetryCountContext = createContext<Map<string, number>>(new Map());

export function useNodeStatus(nodeId: string): NodeStatus | undefined {
  const map = useContext(NodeStatusContext);
  return map.get(nodeId);
}

export function useNodeRetryCount(nodeId: string): number {
  const map = useContext(NodeRetryCountContext);
  return map.get(nodeId) ?? 0;
}

/* ── Canvas 组件 ───────────────────────────── */

interface CanvasProps {
  nodes: WorkflowNode[];
  edges: { id: string; source: string; target: string }[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  nodeStatuses: Map<string, NodeStatus>;
  nodeLogs?: NodeLog[];
  onAddNode: (type: string, position: { x: number; y: number }) => void;
  onDeleteNode: (id: string) => void;
}

export default function Canvas({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  nodeStatuses,
  nodeLogs = [],
  onAddNode,
  onDeleteNode,
}: CanvasProps) {
  const [dragOver, setDragOver] = useState(false);

  // 从 nodeLogs 中提取每个节点的重试次数
  const retryCountMap = new Map<string, number>();
  for (const log of nodeLogs) {
    if (log.retryCount > 0) {
      retryCountMap.set(log.nodeId, log.retryCount);
    }
  }

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
      <NodeRetryCountContext.Provider value={retryCountMap}>
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

              const srcStatus = nodeStatuses.get(edge.source);
              const stroke = edgeStrokeColor(srcStatus);

              return (
                <g key={edge.id}>
                  {/* 错误连线的红色发光效果 */}
                  {srcStatus === "error" && (
                    <path
                      d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                      stroke="#ef4444"
                      strokeWidth={6}
                      fill="none"
                      opacity={0.15}
                    />
                  )}
                  <path
                    d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                    stroke={stroke}
                    strokeWidth={2}
                    fill="none"
                    strokeDasharray={srcStatus === "retrying" ? "4 4" : "none"}
                  />
                </g>
              );
            })}
          </svg>

          {/* 节点层 */}
          {nodes.map((node) => {
            const status = nodeStatuses.get(node.id);
            const retryCount = retryCountMap.get(node.id) ?? 0;
            return (
              <div
                key={node.id}
                className="absolute"
                style={{ left: node.position.x, top: node.position.y }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node.id);
                }}
              >
                {/* 错误节点的红色发光背景 */}
                {status === "error" && (
                  <div className="absolute -inset-1 rounded-lg bg-red-500/10 animate-pulse" />
                )}
                {renderNode(node, selectedNodeId === node.id, status, retryCount)}
              </div>
            );
          })}

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
      </NodeRetryCountContext.Provider>
    </NodeStatusContext.Provider>
  );
}

/* ── 节点渲染 ──────────────────────────────── */

function renderNode(
  node: WorkflowNode,
  selected: boolean,
  status?: NodeStatus,
  retryCount?: number,
) {
  const props = { node, selected, onSelect: () => {}, status, retryCount };
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

/* ── 边框颜色 ──────────────────────────────── */

function edgeStrokeColor(status?: NodeStatus): string {
  switch (status) {
    case "error":
      return "#ef4444";
    case "success":
      return "#22c55e";
    case "running":
      return "#eab308";
    case "retrying":
      return "#f97316";
    case "skipped":
      return "#52525b";
    default:
      return "#52525b";
  }
}
