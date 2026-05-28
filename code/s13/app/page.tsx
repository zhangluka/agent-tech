/**
 * Build An Agent - s13: 连线与执行
 *
 * 主页面：左侧节点面板 + 中间画布 + 右侧配置/执行面板。
 * s13 新增：运行按钮和执行引擎集成。
 */

"use client";

import { useCallback } from "react";
import { useWorkflowStore } from "./store/workflowStore";
import type { NodeType, FlowNode, NodeStatus, ExecutionLog } from "./engine/types";
import { executeWorkflow } from "./engine/executor";
import Canvas from "./components/Canvas";
import SidePanel from "./components/SidePanel";
import ExecutionPanel from "./components/ExecutionPanel";

/** 节点工具箱 */
const TOOLBOX: { type: NodeType; label: string; icon: string }[] = [
  { type: "start", label: "Start", icon: "▶" },
  { type: "llm", label: "LLM", icon: "✦" },
  { type: "tool", label: "Tool", icon: "⚙" },
  { type: "condition", label: "Condition", icon: "◇" },
  { type: "end", label: "End", icon: "■" },
];

export default function Home() {
  const addNode = useWorkflowStore((s) => s.addNode);
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const setRunning = useWorkflowStore((s) => s.setRunning);
  const setNodeStatus = useWorkflowStore((s) => s.setNodeStatus);
  const setNodeOutput = useWorkflowStore((s) => s.setNodeOutput);
  const setCurrentNodeId = useWorkflowStore((s) => s.setCurrentNodeId);
  const addExecutionLog = useWorkflowStore((s) => s.addExecutionLog);
  const resetExecution = useWorkflowStore((s) => s.resetExecution);

  /** 添加节点到画布 */
  const handleAddNode = useCallback(
    (type: NodeType) => {
      const id = crypto.randomUUID().slice(0, 8);
      const defaults: Record<NodeType, Record<string, string>> = {
        start: { variables: '{"user_input": ""}' },
        llm: { prompt: "", system_prompt: "", model: "deepseek-chat" },
        tool: { tool_name: "echo", arguments: '{}' },
        condition: { expression: "" },
        end: { source: "" },
      };
      const node: FlowNode = {
        id,
        type,
        label: `${type}_${id.slice(0, 4)}`,
        x: 200 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        config: defaults[type],
      };
      addNode(node);
    },
    [addNode]
  );

  /** 运行工作流 */
  const handleRun = useCallback(async () => {
    if (isRunning) return;

    resetExecution();
    setRunning(true);

    try {
      await executeWorkflow(nodes, edges, {
        onNodeStatusChange: (id: string, status: NodeStatus) => setNodeStatus(id, status),
        onLog: (log: ExecutionLog) => addExecutionLog(log),
        onOutput: (id: string, output: string) => setNodeOutput(id, output),
        onComplete: () => setRunning(false),
        onError: (id: string, error: string) => {
          console.error(`节点 ${id} 执行失败:`, error);
        },
      });
    } catch (err) {
      console.error("执行失败:", err);
      setRunning(false);
    }
  }, [nodes, edges, isRunning, resetExecution, setRunning, setNodeStatus, setNodeOutput, addExecutionLog]);

  /** 清除执行状态 */
  const handleReset = useCallback(() => {
    resetExecution();
  }, [resetExecution]);

  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-100">
      {/* 左侧：节点工具箱 */}
      <div className="w-48 border-r border-zinc-700 flex flex-col">
        <div className="px-3 py-3 border-b border-zinc-700">
          <h1 className="text-sm font-bold">节点</h1>
        </div>
        <div className="flex-1 p-2 space-y-1.5">
          {TOOLBOX.map((item) => (
            <button
              key={item.type}
              onClick={() => handleAddNode(item.type)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg
                         bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* 运行按钮 */}
        <div className="p-3 border-t border-zinc-700 space-y-2">
          <button
            onClick={handleRun}
            disabled={isRunning || nodes.length === 0}
            className="w-full py-2 rounded-lg text-sm font-medium transition-colors
                       bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700
                       disabled:text-zinc-500 text-white"
          >
            {isRunning ? "执行中..." : "▶ 运行"}
          </button>
          <button
            onClick={handleReset}
            disabled={isRunning}
            className="w-full py-1.5 rounded-lg text-xs text-zinc-400
                       hover:text-zinc-200 transition-colors"
          >
            清除状态
          </button>
        </div>
      </div>

      {/* 中间：画布 */}
      <div className="flex-1">
        <Canvas />
      </div>

      {/* 右侧：配置 + 执行面板 */}
      <div className="w-72 border-l border-zinc-700 flex flex-col">
        <div className="flex-1 min-h-0">
          <SidePanel />
        </div>
        <div className="h-64 border-t border-zinc-700">
          <ExecutionPanel />
        </div>
      </div>
    </div>
  );
}
