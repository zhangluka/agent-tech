/**
 * Build An Agent - s13: 连线与执行
 *
 * 工作流状态管理：节点、连线、执行状态。
 */

import { create } from "zustand";
import type { FlowNode, FlowEdge, NodeStatus, ExecutionLog } from "../engine/types";

export type { ExecutionLog };

interface WorkflowStore {
  // ── 节点和连线 ──
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;

  addNode: (node: FlowNode) => void;
  updateNode: (id: string, updates: Partial<FlowNode>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  moveNode: (id: string, x: number, y: number) => void;

  addEdge: (edge: FlowEdge) => void;
  deleteEdge: (id: string) => void;

  // ── 执行状态 ──
  isRunning: boolean;
  nodeStatuses: Record<string, NodeStatus>;
  nodeOutputs: Record<string, string>;
  currentNodeId: string | null;
  executionLogs: ExecutionLog[];
  expandedOutput: string | null;

  setRunning: (running: boolean) => void;
  setNodeStatus: (id: string, status: NodeStatus) => void;
  setNodeOutput: (id: string, output: string) => void;
  setCurrentNodeId: (id: string | null) => void;
  addExecutionLog: (log: ExecutionLog) => void;
  setExpandedOutput: (id: string | null) => void;
  resetExecution: () => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  // ── 节点和连线 ──
  nodes: [],
  edges: [],
  selectedNodeId: null,

  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),

  updateNode: (id, updates) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),

  deleteNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    })),

  selectNode: (id) => set({ selectedNodeId: id }),

  moveNode: (id, x, y) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    })),

  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),

  deleteEdge: (id) => set((s) => ({ edges: s.edges.filter((e) => e.id !== id) })),

  // ── 执行状态 ──
  isRunning: false,
  nodeStatuses: {},
  nodeOutputs: {},
  currentNodeId: null,
  executionLogs: [],
  expandedOutput: null,

  setRunning: (running) => set({ isRunning: running }),

  setNodeStatus: (id, status) =>
    set((s) => ({
      nodeStatuses: { ...s.nodeStatuses, [id]: status },
    })),

  setNodeOutput: (id, output) =>
    set((s) => ({
      nodeOutputs: { ...s.nodeOutputs, [id]: output },
    })),

  setCurrentNodeId: (id) => set({ currentNodeId: id }),

  addExecutionLog: (log) =>
    set((s) => ({
      executionLogs: [...s.executionLogs, log],
    })),

  setExpandedOutput: (id) => set({ expandedOutput: id }),

  resetExecution: () =>
    set({
      nodeStatuses: {},
      nodeOutputs: {},
      currentNodeId: null,
      executionLogs: [],
      expandedOutput: null,
    }),
}));
