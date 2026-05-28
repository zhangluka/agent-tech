"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import StartNode from "./nodes/StartNode";
import LLMNode from "./nodes/LLMNode";
import ToolNode from "./nodes/ToolNode";
import ConditionNode from "./nodes/ConditionNode";
import EndNode from "./nodes/EndNode";
import SidePanel from "./SidePanel";
import { getDefaultData, type NodeDataType } from "../types/nodeTypes";

const nodeTypes = {
  start: StartNode,
  llm: LLMNode,
  tool: ToolNode,
  condition: ConditionNode,
  end: EndNode,
};

const initialNodes: Node[] = [
  {
    id: "1",
    type: "start",
    position: { x: 250, y: 0 },
    data: getDefaultData("start"),
  },
  {
    id: "2",
    type: "llm",
    position: { x: 250, y: 150 },
    data: getDefaultData("llm"),
  },
  {
    id: "3",
    type: "tool",
    position: { x: 250, y: 350 },
    data: getDefaultData("tool"),
  },
  {
    id: "4",
    type: "end",
    position: { x: 250, y: 530 },
    data: getDefaultData("end"),
  },
];

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", animated: true },
  { id: "e2-3", source: "2", target: "3", animated: true },
  { id: "e3-4", source: "3", target: "4", animated: true },
];

export default function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  function addNode(type: NodeDataType) {
    const id = `${Date.now()}`;
    const newNode: Node = {
      id,
      type,
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: getDefaultData(type),
    };
    setNodes((nds) => [...nds, newNode]);
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 relative">
        {/* 工具栏 */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          {(
            [
              { type: "start" as NodeDataType, label: "▶ Start", color: "bg-green-800 hover:bg-green-700" },
              { type: "llm" as NodeDataType, label: "🧠 LLM", color: "bg-purple-800 hover:bg-purple-700" },
              { type: "tool" as NodeDataType, label: "🔧 Tool", color: "bg-amber-800 hover:bg-amber-700" },
              { type: "condition" as NodeDataType, label: "⑂ Condition", color: "bg-yellow-800 hover:bg-yellow-700" },
              { type: "end" as NodeDataType, label: "■ End", color: "bg-red-800 hover:bg-red-700" },
            ] as const
          ).map(({ type, label, color }) => (
            <button
              key={type}
              onClick={() => addNode(type)}
              className={`${color} text-white text-xs px-3 py-1.5 rounded-lg transition-colors`}
            >
              {label}
            </button>
          ))}
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-zinc-950"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case "start":
                  return "#22c55e";
                case "llm":
                  return "#a855f7";
                case "tool":
                  return "#f59e0b";
                case "condition":
                  return "#eab308";
                case "end":
                  return "#ef4444";
                default:
                  return "#52525b";
              }
            }}
            maskColor="rgba(0,0,0,0.7)"
          />
        </ReactFlow>
      </div>

      <SidePanel selectedNode={selectedNode} />
    </div>
  );
}
