import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

interface ChatStore {
  sessions: Session[];
  currentSessionId: string | null;
  createSession: () => void;
  deleteSession: (id: string) => void;
  switchSession: (id: string) => void;
  addMessage: (msg: Message) => void;
  updateLastMessage: (content: string) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,

      createSession: () => {
        const id = crypto.randomUUID();
        const newSession: Session = {
          id,
          title: '新对话',
          messages: [],
          createdAt: Date.now(),
        };
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: id,
        }));
      },

      deleteSession: (id: string) => {
        set((state) => {
          const remaining = state.sessions.filter((s) => s.id !== id);
          const newCurrentId =
            state.currentSessionId === id
              ? remaining[0]?.id ?? null
              : state.currentSessionId;
          return { sessions: remaining, currentSessionId: newCurrentId };
        });
      },

      switchSession: (id: string) => {
        set({ currentSessionId: id });
      },

      addMessage: (msg: Message) => {
        set((state) => {
          const sid = state.currentSessionId;
          if (!sid) return state;

          const sessions = state.sessions.map((s) => {
            if (s.id !== sid) return s;
            const title =
              s.messages.length === 0 && msg.role === 'user'
                ? msg.content.slice(0, 20) +
                  (msg.content.length > 20 ? '...' : '')
                : s.title;
            return { ...s, messages: [...s.messages, msg], title };
          });
          return { sessions };
        });
      },

      updateLastMessage: (content: string) => {
        set((state) => {
          const sid = state.currentSessionId;
          if (!sid) return state;

          const sessions = state.sessions.map((s) => {
            if (s.id !== sid) return s;
            const msgs = [...s.messages];
            if (msgs.length === 0) return s;
            msgs[msgs.length - 1] = {
              ...msgs[msgs.length - 1],
              content,
            };
            return { ...s, messages: msgs };
          });
          return { sessions };
        });
      },
    }),
    {
      name: 'chat-sessions',
    }
  )
);
