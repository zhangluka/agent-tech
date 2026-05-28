"use client";

import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type OnConnect,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import StartNode from "./nodes/StartNode";
import LLMNode from "./nodes/LLMNode";
import ToolNode from "./nodes/ToolNode";
import EndNode from "./nodes/EndNode";

// 把自定义节点类型注册给 React Flow
const nodeTypes = {
  start: StartNode,
  llm: LLMNode,
  tool: ToolNode,
  end: EndNode,
};

// 初始节点：画布打开时你看到的东西
const initialNodes: Node[] = [
  {
    id: "start-1",
    type: "start",
    position: { x: 250, y: 50 },
    data: { label: "开始" },
  },
  {
    id: "llm-1",
    type: "llm",
    position: { x: 230, y: 200 },
    data: { label: "理解意图", model: "deepseek-chat" },
  },
  {
    id: "tool-1",
    type: "tool",
    position: { x: 100, y: 380 },
    data: { label: "搜索工具", toolName: "web_search" },
  },
  {
    id: "llm-2",
    type: "llm",
    position: { x: 230, y: 530 },
    data: { label: "生成回答", model: "deepseek-chat" },
  },
  {
    id: "end-1",
    type: "end",
    position: { x: 250, y: 700 },
    data: { label: "结束" },
  },
];

// 初始连线：把节点串起来
const initialEdges: Edge[] = [
  { id: "e1", source: "start-1", target: "llm-1", animated: true },
  { id: "e2", source: "llm-1", target: "tool-1" },
  { id: "e3", source: "tool-1", target: "llm-2" },
  { id: "e4", source: "llm-2", target: "end-1", animated: true },
];

interface CanvasProps {
  onSelectNode: (node: Node | null) => void;
}

export default function Canvas({ onSelectNode }: CanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 两个节点之间画线时触发
  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges]
  );

  // 点击节点时通知父组件（用来打开侧面板）
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node);
    },
    [onSelectNode]
  );

  // 点击空白区域时关闭侧面板
  const onPaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  return (
    <div className="w-full h-full">
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
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case "start":
                return "#059669";
              case "llm":
                return "#2563eb";
              case "tool":
                return "#ea580c";
              case "end":
                return "#dc2626";
              default:
                return "#6b7280";
            }
          }}
          maskColor="rgba(0,0,0,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
