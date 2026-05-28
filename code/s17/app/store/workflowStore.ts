/**
 * Build An Agent - s17: 错误恢复
 *
 * 工作流状态管理。
 * 集中管理 workflow、执行状态、错误恢复状态。
 * 使用 React Context + useReducer 实现。
 */

"use client";

import { createContext, useContext, useReducer, type ReactNode } from "react";
import type {
  Workflow,
  WorkflowNode,
  NodeStatus,
  NodeError,
  ExecutionRun,
  ErrorAction,
} from "../engine/types";

/* ── 状态类型 ──────────────────────────────── */

export interface WorkflowState {
  workflow: Workflow;
  selectedNodeId: string | null;
  nodeStatuses: Map<string, NodeStatus>;
  currentRun: ExecutionRun | null;
  historyRuns: ExecutionRun[];
  activeRunId: string | null;

  // 错误恢复相关
  currentError: {
    nodeId: string;
    error: NodeError;
    attempt: number;
  } | null;
  isRecovering: boolean;
}

/* ── 动作类型 ──────────────────────────────── */

export type WorkflowAction =
  | { type: "SET_WORKFLOW"; workflow: Workflow }
  | { type: "SELECT_NODE"; nodeId: string | null }
  | { type: "ADD_NODE"; node: WorkflowNode }
  | { type: "DELETE_NODE"; nodeId: string }
  | { type: "UPDATE_NODE_DATA"; nodeId: string; data: Record<string, unknown> }
  | { type: "SET_NODE_STATUSES"; statuses: Map<string, NodeStatus> }
  | { type: "SET_CURRENT_RUN"; run: ExecutionRun | null }
  | { type: "ADD_HISTORY_RUN"; run: ExecutionRun }
  | { type: "SET_ACTIVE_RUN"; runId: string | null }
  | { type: "DELETE_HISTORY_RUN"; runId: string }
  | { type: "SET_ERROR"; nodeId: string; error: NodeError; attempt: number }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_RECOVERING"; isRecovering: boolean }
  | { type: "RESET" };

/* ── Reducer ───────────────────────────────── */

function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case "SET_WORKFLOW":
      return { ...state, workflow: action.workflow };

    case "SELECT_NODE":
      return { ...state, selectedNodeId: action.nodeId };

    case "ADD_NODE":
      return {
        ...state,
        workflow: {
          ...state.workflow,
          nodes: [...state.workflow.nodes, action.node],
        },
      };

    case "DELETE_NODE":
      return {
        ...state,
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.filter((n) => n.id !== action.nodeId),
          edges: state.workflow.edges.filter(
            (e) => e.source !== action.nodeId && e.target !== action.nodeId,
          ),
        },
        selectedNodeId:
          state.selectedNodeId === action.nodeId ? null : state.selectedNodeId,
      };

    case "UPDATE_NODE_DATA":
      return {
        ...state,
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.map((n) =>
            n.id === action.nodeId ? { ...n, data: action.data } : n,
          ),
        },
      };

    case "SET_NODE_STATUSES":
      return { ...state, nodeStatuses: action.statuses };

    case "SET_CURRENT_RUN":
      return { ...state, currentRun: action.run };

    case "ADD_HISTORY_RUN":
      return {
        ...state,
        historyRuns: [action.run, ...state.historyRuns],
        activeRunId: action.run.id,
      };

    case "SET_ACTIVE_RUN":
      return { ...state, activeRunId: action.runId };

    case "DELETE_HISTORY_RUN":
      return {
        ...state,
        historyRuns: state.historyRuns.filter((r) => r.id !== action.runId),
        activeRunId:
          state.activeRunId === action.runId ? null : state.activeRunId,
      };

    case "SET_ERROR":
      return {
        ...state,
        currentError: {
          nodeId: action.nodeId,
          error: action.error,
          attempt: action.attempt,
        },
      };

    case "CLEAR_ERROR":
      return { ...state, currentError: null };

    case "SET_RECOVERING":
      return { ...state, isRecovering: action.isRecovering };

    case "RESET":
      return {
        ...state,
        currentRun: null,
        nodeStatuses: new Map(),
        activeRunId: null,
        currentError: null,
        isRecovering: false,
      };

    default:
      return state;
  }
}

/* ── Context ───────────────────────────────── */

const WorkflowStateContext = createContext<WorkflowState | null>(null);
const WorkflowDispatchContext = createContext<React.Dispatch<WorkflowAction> | null>(null);

export function WorkflowProvider({
  initialWorkflow,
  children,
}: {
  initialWorkflow: Workflow;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(workflowReducer, {
    workflow: initialWorkflow,
    selectedNodeId: null,
    nodeStatuses: new Map(),
    currentRun: null,
    historyRuns: [],
    activeRunId: null,
    currentError: null,
    isRecovering: false,
  });

  return (
    <WorkflowStateContext.Provider value={state}>
      <WorkflowDispatchContext.Provider value={dispatch}>
        {children}
      </WorkflowDispatchContext.Provider>
    </WorkflowStateContext.Provider>
  );
}

export function useWorkflowState(): WorkflowState {
  const ctx = useContext(WorkflowStateContext);
  if (!ctx) throw new Error("useWorkflowState must be used within WorkflowProvider");
  return ctx;
}

export function useWorkflowDispatch(): React.Dispatch<WorkflowAction> {
  const ctx = useContext(WorkflowDispatchContext);
  if (!ctx) throw new Error("useWorkflowDispatch must be used within WorkflowProvider");
  return ctx;
}
