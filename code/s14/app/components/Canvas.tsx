"use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

import InputNode from "./nodes/InputNode";
import LlmNode from "./nodes/LlmNode";
import TransformNode from "./nodes/TransformNode";
import ConditionNode from "./nodes/ConditionNode";
import OutputNode from "./nodes/OutputNode";

// 节点类型注册
const nodeTypes = {
  input: InputNode,
  llm: LlmNode,
  transform: TransformNode,
  condition: ConditionNode,
  output: OutputNode,
};

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: ReturnType<typeof useNodesState>[2];
  onEdgesChange: ReturnType<typeof useEdgesState>[2];
  onConnect: (connection: Connection) => void;
  onNodeSelect?: (node: Node | null) => void;
}

/**
 * 画布组件 — 拖拽编排工作流
 */
export default function Canvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeSelect,
}: CanvasProps) {
  const handleConnect = useCallback(
    (params: Connection) => {
      onConnect(params);
    },
    [onConnect]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect?.(node);
    },
    [onNodeSelect]
  );

  const handlePaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-zinc-900"
      >
        <Background color="#3f3f46" gap={16} />
        <Controls className="!bg-zinc-800 !border-zinc-700" />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case "input":
                return "#10b981";
              case "llm":
                return "#8b5cf6";
              case "transform":
                return "#f59e0b";
              case "condition":
                return "#0ea5e9";
              case "output":
                return "#f43f5e";
              default:
                return "#52525b";
            }
          }}
          className="!bg-zinc-800 !border-zinc-700"
        />
      </ReactFlow>
    </div>
  );
}
