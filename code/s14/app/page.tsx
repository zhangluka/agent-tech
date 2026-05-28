"use client";

import { useState, useCallback } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
} from "reactflow";

import Canvas from "./components/Canvas";
import SidePanel from "./components/SidePanel";
import ExecutionPanel from "./components/ExecutionPanel";
import ImportExport from "./components/ImportExport";
import WorkflowLibrary from "./components/WorkflowLibrary";
import { executeWorkflow, type ExecuteResult } from "./engine/executor";
import type { WorkflowJSON } from "./utils/workflowIO";

// ── 初始节点 ──────────────────────────────────────────────

const initialNodes: Node[] = [
  {
    id: "input-1",
    type: "input",
    position: { x: 100, y: 50 },
    data: { label: "用户输入", value: "用一句话解释量子计算" },
  },
  {
    id: "llm-1",
    type: "llm",
    position: { x: 100, y: 200 },
    data: { label: "生成解释", model: "deepseek-chat" },
  },
  {
    id: "output-1",
    type: "output",
    position: { x: 100, y: 350 },
    data: { label: "结果" },
  },
];

const initialEdges: Edge[] = [
  { id: "e1", source: "input-1", target: "llm-1" },
  { id: "e2", source: "llm-1", target: "output-1" },
];

// ── 可拖拽的节点模板 ──────────────────────────────────────

const nodeTemplates = [
  { type: "input", label: "输入", color: "emerald" },
  { type: "llm", label: "LLM", color: "violet" },
  { type: "transform", label: "转换", color: "amber" },
  { type: "condition", label: "条件", color: "sky" },
  { type: "output", label: "输出", color: "rose" },
];

// ── 页面 ──────────────────────────────────────────────────

export default function Page() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [results, setResults] = useState<ExecuteResult[]>([]);
  const [running, setRunning] = useState(false);
  const [workflowName, setWorkflowName] = useState("示例工作流");
  const [showLibrary, setShowLibrary] = useState(false);

  // 连线
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  // 更新节点数据
  const handleUpdateNode = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data } : n))
      );
      // 同步 selectedNode
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, data } : prev
      );
    },
    [setNodes]
  );

  // 拖拽添加节点
  const handleDragStart = useCallback(
    (e: React.DragEvent, type: string) => {
      e.dataTransfer.setData("nodeType", type);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      const type = e.dataTransfer.getData("nodeType");
      if (!type) return;

      const id = `${type}-${Date.now()}`;
      const newNode: Node = {
        id,
        type,
        position: { x: e.clientX - 260, y: e.clientY - 60 },
        data: { label: nodeTemplates.find((t) => t.type === type)?.label || type },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // 执行工作流
  const handleRun = async () => {
    setRunning(true);
    setResults([]);

    const onUpdate = (nodeId: string, status: string, output?: unknown, error?: string) => {
      setResults((prev) => {
        const idx = prev.findIndex((r) => r.nodeId === nodeId);
        const item = { nodeId, status: status as ExecuteResult["status"], output, error };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = item;
          return next;
        }
        return [...prev, item];
      });
    };

    try {
      await executeWorkflow(nodes, edges, onUpdate);
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  // 从导入/库加载
  const handleLoad = (
    newNodes: Node[],
    newEdges: Edge[],
    meta?: WorkflowJSON["meta"]
  ) => {
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNode(null);
    setResults([]);
    if (meta?.name) setWorkflowName(meta.name);
  };

  return (
    <div
      className="h-screen flex flex-col bg-zinc-950 text-zinc-100"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* 顶部工具栏 */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium text-zinc-200">工作流编排</h1>
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 w-40"
            placeholder="工作流名称"
          />
        </div>

        <div className="flex items-center gap-3">
          <ImportExport
            nodes={nodes}
            edges={edges}
            onLoad={handleLoad}
            workflowName={workflowName}
          />
        </div>
      </header>

      {/* 主体区域 */}
      <div className="flex-1 flex min-h-0">
        {/* 左侧：节点模板 */}
        <aside className="w-48 border-r border-zinc-800 bg-zinc-900 p-3 space-y-2">
          <p className="text-zinc-500 text-xs mb-2">拖拽添加节点</p>
          {nodeTemplates.map((t) => (
            <div
              key={t.type}
              draggable
              onDragStart={(e) => handleDragStart(e, t.type)}
              className={`
                px-3 py-2 rounded cursor-grab active:cursor-grabbing
                bg-zinc-800 border border-zinc-700 hover:border-${t.color}-500
                text-sm text-zinc-300 text-center transition-colors
              `}
            >
              {t.label}
            </div>
          ))}

          {/* 本地库入口 */}
          <div className="pt-4 border-t border-zinc-800 mt-4">
            <button
              onClick={() => setShowLibrary(!showLibrary)}
              className="w-full text-left text-zinc-400 text-xs hover:text-zinc-200 transition-colors"
            >
              {showLibrary ? "收起本地库" : "展开本地库"} ▸
            </button>
          </div>
        </aside>

        {/* 中间：画布 */}
        <main className="flex-1 min-w-0">
          <Canvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeSelect={setSelectedNode}
          />
        </main>

        {/* 右侧面板 */}
        <aside className="w-72 border-l border-zinc-800 bg-zinc-900 flex flex-col">
          {/* 本地库（折叠） */}
          {showLibrary && (
            <div className="border-b border-zinc-800">
              <WorkflowLibrary onLoad={handleLoad} />
            </div>
          )}

          {/* 节点属性 */}
          <div className="flex-1 overflow-y-auto border-b border-zinc-800">
            <SidePanel
              selectedNode={selectedNode}
              onUpdateNode={handleUpdateNode}
            />
          </div>

          {/* 执行面板 */}
          <div className="h-[280px] flex-shrink-0">
            <ExecutionPanel
              results={results}
              running={running}
              onRun={handleRun}
              onClear={() => setResults([])}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
