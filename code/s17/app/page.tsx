/**
 * Build An Agent - s17: 错误恢复
 *
 * 主页面：三栏布局 + 错误恢复控制。
 *
 * 在 s15 基础上增加了：
 *   - 执行时传入错误恢复配置
 *   - 节点失败时弹出 ErrorBanner，用户选择动作
 *   - 工具栏显示恢复状态
 */

"use client";

import { useState, useCallback } from "react";
import type {
  Workflow,
  WorkflowNode,
  NodeStatus,
  NodeError,
  ExecutionRun,
  ErrorAction,
} from "./engine/types";
import Canvas from "./components/Canvas";
import SidePanel from "./components/SidePanel";
import ExecutionPanel from "./components/ExecutionPanel";
import ErrorBanner from "./components/ErrorBanner";
import { executeWorkflow } from "./engine/executor";
import { downloadWorkflow, uploadWorkflow } from "./utils/workflowIO";

/* ── 默认工作流 ────────────────────────────── */

const DEFAULT_WORKFLOW: Workflow = {
  id: "wf_default",
  name: "示例工作流",
  nodes: [
    {
      id: "n_input",
      type: "input",
      position: { x: 40, y: 120 },
      data: { label: "用户输入" },
    },
    {
      id: "n_llm",
      type: "llm",
      position: { x: 320, y: 100 },
      data: { label: "分析意图", model: "deepseek-chat", prompt: "分析用户意图" },
    },
    {
      id: "n_tool",
      type: "tool",
      position: { x: 600, y: 100 },
      data: { label: "搜索资料", tool: "search" },
    },
    {
      id: "n_output",
      type: "output",
      position: { x: 880, y: 120 },
      data: { label: "最终输出" },
    },
  ],
  edges: [
    { id: "e1", source: "n_input", target: "n_llm" },
    { id: "e2", source: "n_llm", target: "n_tool" },
    { id: "e3", source: "n_tool", target: "n_output" },
  ],
};

/* ── 页面组件 ──────────────────────────────── */

export default function Home() {
  const [workflow, setWorkflow] = useState<Workflow>(DEFAULT_WORKFLOW);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeStatuses, setNodeStatuses] = useState<Map<string, NodeStatus>>(new Map());
  const [currentRun, setCurrentRun] = useState<ExecutionRun | null>(null);
  const [historyRuns, setHistoryRuns] = useState<ExecutionRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  // 错误恢复状态
  const [errorState, setErrorState] = useState<{
    nodeId: string;
    error: NodeError;
    attempt: number;
    resolve: (action: ErrorAction) => void;
  } | null>(null);

  // 错误恢复配置
  const [maxRetries, setMaxRetries] = useState(3);
  const [autoRollback, setAutoRollback] = useState(true);

  /* ── 节点操作 ────────────────────────────── */

  const addNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const id = `n_${Date.now().toString(36)}`;
      setWorkflow((prev) => ({
        ...prev,
        nodes: [
          ...prev.nodes,
          { id, type: type as WorkflowNode["type"], position, data: {} },
        ],
      }));
    },
    [],
  );

  const deleteNode = useCallback(
    (id: string) => {
      setWorkflow((prev) => ({
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== id),
        edges: prev.edges.filter((e) => e.source !== id && e.target !== id),
      }));
      if (selectedNodeId === id) setSelectedNodeId(null);
    },
    [selectedNodeId],
  );

  const updateNodeData = useCallback(
    (id: string, data: Record<string, unknown>) => {
      setWorkflow((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === id ? { ...n, data } : n,
        ),
      }));
    },
    [],
  );

  /* ── 工作流导入导出 ──────────────────────── */

  const handleExport = useCallback(() => {
    downloadWorkflow(workflow);
  }, [workflow]);

  const handleImport = useCallback(async () => {
    try {
      const imported = await uploadWorkflow();
      setWorkflow(imported);
      setHistoryRuns([]);
      setCurrentRun(null);
    } catch (err) {
      alert(`导入失败: ${err instanceof Error ? err.message : "未知错误"}`);
    }
  }, []);

  /* ── 错误处理回调 ────────────────────────── */

  const handleNodeError = useCallback(
    (nodeId: string, error: NodeError, attempt: number): Promise<ErrorAction> => {
      return new Promise<ErrorAction>((resolve) => {
        setErrorState({ nodeId, error, attempt, resolve });
      });
    },
    [],
  );

  const handleAction = useCallback(
    (action: ErrorAction) => {
      if (errorState) {
        errorState.resolve(action);
        setErrorState(null);
      }
    },
    [errorState],
  );

  /* ── 执行工作流 ──────────────────────────── */

  const handleRun = useCallback(async () => {
    setCurrentRun(null);
    setNodeStatuses(new Map());
    setActiveRunId(null);
    setErrorState(null);

    try {
      const run = await executeWorkflow(
        workflow,
        { input: "示例输入" },
        (updatedRun) => {
          setCurrentRun({ ...updatedRun });
          const statusMap = new Map<string, NodeStatus>();
          for (const log of updatedRun.nodeLogs) {
            statusMap.set(log.nodeId, log.status);
          }
          setNodeStatuses(statusMap);
        },
        { maxRetries, autoRollback },
        handleNodeError,
      );

      setHistoryRuns((prev) => [run, ...prev]);
      setActiveRunId(run.id);
    } catch (err) {
      console.error("执行失败:", err);
    }
  }, [workflow, maxRetries, autoRollback, handleNodeError]);

  /* ── 历史操作 ────────────────────────────── */

  const handleSelectRun = useCallback((id: string) => {
    setActiveRunId(id);
  }, []);

  const handleDeleteRun = useCallback((id: string) => {
    setHistoryRuns((prev) => prev.filter((r) => r.id !== id));
    if (activeRunId === id) setActiveRunId(null);
  }, [activeRunId]);

  /* ── 选中的节点 ──────────────────────────── */

  const selectedNode =
    workflow.nodes.find((n) => n.id === selectedNodeId) ?? null;

  /* ── 渲染 ────────────────────────────────── */

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* 左：节点库 + 属性编辑 */}
      <SidePanel
        selectedNode={selectedNode}
        onUpdateNode={updateNodeData}
      />

      {/* 中：画布 + 顶部工具栏 */}
      <div className="flex-1 flex flex-col">
        {/* 工具栏 */}
        <div className="h-10 border-b border-zinc-800 flex items-center px-3 gap-2">
          <span className="text-xs text-zinc-400 font-medium">
            {workflow.name}
          </span>

          <div className="flex-1" />

          {/* 错误恢复配置 */}
          <div className="flex items-center gap-2 mr-2">
            <label className="text-[10px] text-zinc-500">重试次数</label>
            <select
              value={maxRetries}
              onChange={(e) => setMaxRetries(Number(e.target.value))}
              className="text-[10px] bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-zinc-300"
            >
              <option value={0}>0</option>
              <option value={1}>1</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
            </select>

            <label className="text-[10px] text-zinc-500 flex items-center gap-1">
              <input
                type="checkbox"
                checked={autoRollback}
                onChange={(e) => setAutoRollback(e.target.checked)}
                className="rounded"
              />
              回滚
            </label>
          </div>

          {/* 工作流操作 */}
          <button
            onClick={handleImport}
            className="text-xs text-zinc-400 hover:text-zinc-100 px-2 py-1"
          >
            导入
          </button>
          <button
            onClick={handleExport}
            className="text-xs text-zinc-400 hover:text-zinc-100 px-2 py-1"
          >
            导出
          </button>

          {/* 运行按钮 */}
          <button
            onClick={handleRun}
            disabled={currentRun?.status === "running"}
            className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
              currentRun?.status === "running"
                ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                : "bg-white text-zinc-900 hover:bg-zinc-200"
            }`}
          >
            {currentRun?.status === "running" ? "执行中..." : "运行"}
          </button>
        </div>

        {/* 画布（带错误横幅） */}
        <div className="relative flex-1 overflow-hidden">
          {/* 错误横幅 */}
          {errorState && (
            <ErrorBanner
              nodeId={errorState.nodeId}
              error={errorState.error}
              attempt={errorState.attempt}
              maxRetries={maxRetries}
              onAction={handleAction}
              onClose={() => handleAction("abort")}
            />
          )}

          {/* 回滚状态指示 */}
          {currentRun?.rolledBack && (
            <div className="absolute top-0 left-0 right-0 z-40 bg-amber-950/80 backdrop-blur-sm border-b border-amber-800/50 px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs text-amber-200">
                执行已回滚到初始状态。上下文已恢复，可以修改后重新运行。
              </span>
            </div>
          )}

          <Canvas
            nodes={workflow.nodes}
            edges={workflow.edges}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            nodeStatuses={nodeStatuses}
            nodeLogs={currentRun?.nodeLogs}
            onAddNode={addNode}
            onDeleteNode={deleteNode}
          />
        </div>
      </div>

      {/* 右：执行面板 */}
      <ExecutionPanel
        currentRun={currentRun}
        historyRuns={historyRuns}
        activeRunId={activeRunId}
        onSelectRun={handleSelectRun}
        onDeleteRun={handleDeleteRun}
      />
    </div>
  );
}
