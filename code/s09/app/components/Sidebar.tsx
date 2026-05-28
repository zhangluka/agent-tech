'use client';

import { useChatStore } from '../store/chatStore';

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (isToday) {
    return d.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

export default function Sidebar() {
  const sessions = useChatStore((s) => s.sessions);
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const createSession = useChatStore((s) => s.createSession);
  const switchSession = useChatStore((s) => s.switchSession);
  const deleteSession = useChatStore((s) => s.deleteSession);

  return (
    <div className="w-64 bg-gray-900 text-gray-100 flex flex-col h-screen">
      <div className="p-3">
        <button
          onClick={createSession}
          className="w-full py-2 px-3 border border-gray-600 rounded-lg text-sm
                     hover:bg-gray-800 transition-colors text-left"
        >
          + 新对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => switchSession(session.id)}
            className={`group flex items-center justify-between px-3 py-2 rounded-lg
                        cursor-pointer text-sm transition-colors
                        ${
                          session.id === currentSessionId
                            ? 'bg-gray-700'
                            : 'hover:bg-gray-800'
                        }`}
          >
            <div className="flex-1 min-w-0">
              <div className="truncate">{session.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {formatTime(session.createdAt)}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSession(session.id);
              }}
              className="opacity-0 group-hover:opacity-100 ml-2 text-gray-500
                         hover:text-red-400 transition-opacity text-xs"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
