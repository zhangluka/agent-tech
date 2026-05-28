/**
 * Build An Agent - s13: 连线与执行
 *
 * 画布组件：渲染节点和连线，支持拖拽和连线操作。
 * s13 新增：执行状态的视觉反馈。
 */

"use client";

import { useRef, useState, useCallback } from "react";
import { useWorkflowStore } from "../store/workflowStore";
import type { FlowNode, NodeType, NodeStatus } from "../engine/types";
import StartNode from "./nodes/StartNode";
import LLMNode from "./nodes/LLMNode";
import ToolNode from "./nodes/ToolNode";
import ConditionNode from "./nodes/ConditionNode";
import EndNode from "./nodes/EndNode";

/** 节点组件映射 */
const NODE_COMPONENTS: Record<NodeType, React.ComponentType<{
  node: FlowNode;
  status: NodeStatus;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}>> = {
  start: StartNode,
  llm: LLMNode,
  tool: ToolNode,
  condition: ConditionNode,
  end: EndNode,
};

export default function Canvas() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const nodeStatuses = useWorkflowStore((s) => s.nodeStatuses);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const moveNode = useWorkflowStore((s) => s.moveNode);
  const addEdge = useWorkflowStore((s) => s.addEdge);

  const canvasRef = useRef<HTMLDivElement>(null);

  // 拖拽状态
  const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);

  // 连线状态
  const [connecting, setConnecting] = useState<{ sourceId: string; startX: number; startY: number; endX: number; endY: number } | null>(null);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      selectNode(null);
    }
  }, [selectNode]);

  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragging({
      nodeId,
      offsetX: e.clientX - rect.left - node.x,
      offsetY: e.clientY - rect.top - node.y,
    });
  }, [nodes, selectNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      moveNode(
        dragging.nodeId,
        e.clientX - rect.left - dragging.offsetX,
        e.clientY - rect.top - dragging.offsetY
      );
    }
    if (connecting) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setConnecting({
        ...connecting,
        endX: e.clientX - rect.left,
        endY: e.clientY - rect.top,
      });
    }
  }, [dragging, connecting, moveNode]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setConnecting(null);
  }, []);

  /** 开始连线（从输出端口拖拽） */
  const handlePortMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // 输出端口的位置：节点底部中心
    const portX = node.x + 80; // 大约节点宽度的一半
    const portY = node.y + (node.type === "condition" ? 40 : 80); // 节点高度

    setConnecting({
      sourceId: nodeId,
      startX: portX,
      startY: portY,
      endX: e.clientX - rect.left,
      endY: e.clientY - rect.top,
    });
  }, [nodes]);

  /** 在节点上释放鼠标完成连线 */
  const handleNodeMouseUp = useCallback((targetId: string) => {
    if (connecting && connecting.sourceId !== targetId) {
      // 检查是否已存在相同的边
      const exists = edges.some(
        (e) => e.source === connecting.sourceId && e.target === targetId
      );
      if (!exists) {
        addEdge({
          id: crypto.randomUUID(),
          source: connecting.sourceId,
          target: targetId,
        });
      }
    }
    setConnecting(null);
  }, [connecting, edges, addEdge]);

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full bg-zinc-900 overflow-hidden
                 bg-[radial-gradient(circle,_#27272a_1px,_transparent_1px)]
                 bg-[length:24px_24px]"
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 连线 SVG 层 */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* 已有的连线 */}
        {edges.map((edge) => {
          const source = nodes.find((n) => n.id === edge.source);
          const target = nodes.find((n) => n.id === edge.target);
          if (!source || !target) return null;

          const x1 = source.x + 80;
          const y1 = source.y + 80;
          const x2 = target.x + 80;
          const y2 = target.y;

          // 贝塞尔曲线
          const midY = (y1 + y2) / 2;

          // 连线颜色：如果源节点执行完成，显示绿色
          const sourceStatus = nodeStatuses[edge.source];
          const strokeColor = sourceStatus === "completed" ? "#22c55e"
            : sourceStatus === "error" ? "#ef4444"
            : sourceStatus === "running" ? "#f59e0b"
            : "#52525b";

          return (
            <path
              key={edge.id}
              d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth={2}
              className="transition-colors duration-300"
            />
          );
        })}

        {/* 正在画的连线 */}
        {connecting && (
          <path
            d={`M ${connecting.startX} ${connecting.startY} C ${connecting.startX} ${(connecting.startY + connecting.endY) / 2}, ${connecting.endX} ${(connecting.startY + connecting.endY) / 2}, ${connecting.endX} ${connecting.endY}`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="6 3"
          />
        )}
      </svg>

      {/* 节点层 */}
      {nodes.map((node) => {
        const Component = NODE_COMPONENTS[node.type];
        if (!Component) return null;

        return (
          <div
            key={node.id}
            onMouseUp={() => handleNodeMouseUp(node.id)}
          >
            <Component
              node={node}
              status={nodeStatuses[node.id] || "pending"}
              selected={selectedNodeId === node.id}
              onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
            />
          </div>
        );
      })}

      {/* 空状态提示 */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-zinc-600">
            <div className="text-4xl mb-3">◇</div>
            <div className="text-sm">从左侧面板拖入节点开始构建工作流</div>
          </div>
        </div>
      )}
    </div>
  );
}
