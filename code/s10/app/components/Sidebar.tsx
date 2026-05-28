"use client";

/**
 * Build An Agent - s10: 调用可视化
 *
 * 侧边栏：会话列表 + 新建按钮。
 */

import { useChatStore } from "../store/chatStore";

export default function Sidebar() {
  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const createSession = useChatStore((s) => s.createSession);
  const setActiveSession = useChatStore((s) => s.setActiveSession);
  const deleteSession = useChatStore((s) => s.deleteSession);

  return (
    <div className="w-64 h-screen border-r border-zinc-800 bg-zinc-950 flex flex-col">
      {/* 新建按钮 */}
      <div className="p-3">
        <button
          onClick={createSession}
          className="w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          + 新对话
        </button>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => setActiveSession(session.id)}
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
              session.id === activeSessionId
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300"
            }`}
          >
            <span className="flex-1 truncate">{session.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSession(session.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
