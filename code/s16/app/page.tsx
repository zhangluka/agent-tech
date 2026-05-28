"use client";

/**
 * Build An Agent - s16: 权限与确认
 *
 * 主页面。
 * 在 s15 基础上集成了权限系统：
 *   - 执行前创建 PermissionChecker
 *   - 遇到需要确认的工具调用时暂停执行，弹出确认对话框
 *   - 用户决定后继续执行或跳过
 *   - 右侧面板新增"权限"标签页，显示所有权限决定的历史
 */

import { useState, useCallback, useRef } from "react";
import type {
  Workflow,
  WorkflowNode,
  NodeStatus,
  ExecutionRun,
  PendingConfirmation,
  PermissionLog as PermissionLogEntry,
  SessionPermissions,
} from "./engine/types";
import Canvas from "./components/Canvas";
import SidePanel from "./components/SidePanel";
import ExecutionPanel from "./components/ExecutionPanel";
import ConfirmationDialog from "./components/ConfirmationDialog";
import { executeWorkflow } from "./engine/executor";
import { PermissionChecker } from "./engine/permission";
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

  /* ── s16: 权限相关状态 ──────────────────── */

  // 当前弹窗中的确认请求
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  // 权限日志（UI 展示用）
  const [permissionLogs, setPermissionLogs] = useState<PermissionLogEntry[]>([]);

  // 会话级权限配置（始终允许/始终拒绝的工具列表）
  const sessionPermissionsRef = useRef<SessionPermissions>({
    alwaysAllow: new Set<string>(),
    alwaysDeny: new Set<string>(),
  });

  // 执行器暂停时的 resolve 函数——用户点击弹窗按钮后调用
  const confirmResolveRef = useRef<((approved: boolean) => void) | null>(null);

  /* ── 确认回调 ────────────────────────────── */

  /**
   * 执行器遇到需要确认的工具调用时会调用这个函数。
   * 它返回一个 Promise，挂起直到用户点击弹窗按钮。
   */
  const handleConfirm = useCallback(
    (confirmation: PendingConfirmation): Promise<boolean> => {
      return new Promise((resolve) => {
        // 把确认信息显示在弹窗上
        setPendingConfirmation(confirmation);
        // 存住 resolve，等用户点按钮时调用
        confirmResolveRef.current = resolve;
      });
    },
    [],
  );

  /** 用户点了"允许" */
  const handleAllow = useCallback(() => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(true);
      confirmResolveRef.current = null;
    }
    setPendingConfirmation(null);
  }, []);

  /** 用户点了"拒绝" */
  const handleDeny = useCallback(() => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(false);
      confirmResolveRef.current = null;
    }
    setPendingConfirmation(null);
  }, []);

  /** 用户点了"始终允许" */
  const handleAlwaysAllow = useCallback(() => {
    if (pendingConfirmation) {
      sessionPermissionsRef.current.alwaysAllow.add(pendingConfirmation.toolName);
    }
    if (confirmResolveRef.current) {
      confirmResolveRef.current(true);
      confirmResolveRef.current = null;
    }
    setPendingConfirmation(null);
  }, [pendingConfirmation]);

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

  /* ── 执行工作流 ──────────────────────────── */

  const handleRun = useCallback(async () => {
    // 重置状态
    setCurrentRun(null);
    setNodeStatuses(new Map());
    setActiveRunId(null);
    setPermissionLogs([]);

    // 每次执行创建新的 checker，但复用会话权限配置
    const checker = new PermissionChecker(sessionPermissionsRef.current);

    try {
      const run = await executeWorkflow(
        workflow,
        { input: "示例输入" },
        checker,
        handleConfirm,
        (updatedRun) => {
          setCurrentRun({ ...updatedRun });
          const statusMap = new Map<string, NodeStatus>();
          for (const log of updatedRun.nodeLogs) {
            statusMap.set(log.nodeId, log.status);
          }
          setNodeStatuses(statusMap);
        },
      );

      // 执行完成
      setHistoryRuns((prev) => [run, ...prev]);
      setActiveRunId(run.id);

      // 更新权限日志
      setPermissionLogs(checker.getLogs());
    } catch (err) {
      console.error("执行失败:", err);
    }
  }, [workflow, handleConfirm]);

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

          {/* 会话权限状态 */}
          {sessionPermissionsRef.current.alwaysAllow.size > 0 && (
            <span className="text-[10px] text-emerald-500/70">
              {sessionPermissionsRef.current.alwaysAllow.size} 个工具始终允许
            </span>
          )}

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
            className="text-xs bg-white text-zinc-900 px-3 py-1 rounded font-medium hover:bg-zinc-200 transition-colors"
          >
            运行
          </button>
        </div>

        {/* 画布 */}
        <Canvas
          nodes={workflow.nodes}
          edges={workflow.edges}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          nodeStatuses={nodeStatuses}
          onAddNode={addNode}
          onDeleteNode={deleteNode}
        />
      </div>

      {/* 右：执行面板 */}
      <ExecutionPanel
        currentRun={currentRun}
        historyRuns={historyRuns}
        activeRunId={activeRunId}
        permissionLogs={permissionLogs}
        onSelectRun={handleSelectRun}
        onDeleteRun={handleDeleteRun}
      />

      {/* s16: 确认对话框（条件渲染） */}
      {pendingConfirmation && (
        <ConfirmationDialog
          confirmation={pendingConfirmation}
          onAllow={handleAllow}
          onDeny={handleDeny}
          onAlwaysAllow={handleAlwaysAllow}
        />
      )}
    </div>
  );
}
