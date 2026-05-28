/**
 * Build An Agent - s10: 调用可视化
 *
 * Zustand 状态管理。
 * 在 s09 的基础上扩展消息类型，支持工具调用。
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── 类型定义 ────────────────────────────────────────────

export type ToolCallStatus = "pending" | "completed";

export interface ToolCall {
  id: string;          // 服务端返回的 tool_call_id
  name: string;        // 工具名：read_file、list_files 等
  args: Record<string, unknown>;  // 调用参数
  result?: string;     // 执行结果，undefined 表示还在执行中
  status: ToolCallStatus;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls?: ToolCall[];  // 只有 assistant 消息可能有
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

// ── Store ───────────────────────────────────────────────

interface ChatStore {
  sessions: ChatSession[];
  activeSessionId: string | null;

  // Session 操作
  createSession: () => string;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  getActiveSession: () => ChatSession | null;

  // 消息操作
  addMessage: (sessionId: string, msg: ChatMessage) => void;
  appendToLastMessage: (sessionId: string, chunk: string) => void;

  // 工具调用操作（s10 新增）
  addToolCall: (
    sessionId: string,
    assistantMsgId: string,
    toolCall: ToolCall,
  ) => void;
  updateToolCallResult: (
    sessionId: string,
    assistantMsgId: string,
    toolCallId: string,
    result: string,
  ) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,

      createSession: () => {
        const id = `session_${Date.now()}`;
        const session: ChatSession = {
          id,
          title: "新对话",
          messages: [],
          createdAt: Date.now(),
        };
        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: id,
        }));
        return id;
      },

      deleteSession: (id: string) => {
        set((state) => {
          const sessions = state.sessions.filter((s) => s.id !== id);
          const activeSessionId =
            state.activeSessionId === id
              ? sessions[0]?.id ?? null
              : state.activeSessionId;
          return { sessions, activeSessionId };
        });
      },

      setActiveSession: (id: string) => set({ activeSessionId: id }),

      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find((s) => s.id === activeSessionId) ?? null;
      },

      addMessage: (sessionId, msg) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const messages = [...s.messages, msg];
            // 第一条用户消息自动成为标题
            const title =
              s.title === "新对话" && msg.role === "user"
                ? msg.content.slice(0, 20) || "新对话"
                : s.title;
            return { ...s, messages, title };
          }),
        }));
      },

      appendToLastMessage: (sessionId, chunk) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const messages = [...s.messages];
            const last = messages[messages.length - 1];
            if (last && last.role === "assistant") {
              messages[messages.length - 1] = {
                ...last,
                content: last.content + chunk,
              };
            }
            return { ...s, messages };
          }),
        }));
      },

      // s10 新增：添加工具调用到助手消息
      addToolCall: (sessionId, assistantMsgId, toolCall) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const messages = s.messages.map((m) => {
              if (m.id !== assistantMsgId) return m;
              return {
                ...m,
                tool_calls: [...(m.tool_calls ?? []), toolCall],
              };
            });
            return { ...s, messages };
          }),
        }));
      },

      // s10 新增：更新工具调用结果
      updateToolCallResult: (sessionId, assistantMsgId, toolCallId, result) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const messages = s.messages.map((m) => {
              if (m.id !== assistantMsgId) return m;
              if (!m.tool_calls) return m;
              return {
                ...m,
                tool_calls: m.tool_calls.map((tc) =>
                  tc.id === toolCallId
                    ? { ...tc, result, status: "completed" as const }
                    : tc,
                ),
              };
            });
            return { ...s, messages };
          }),
        }));
      },
    }),
    {
      name: "agent-chat-sessions",
      // 只持久化 sessions 数据，不持久化函数
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    },
  ),
);
