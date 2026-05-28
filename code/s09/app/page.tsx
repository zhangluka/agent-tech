'use client';

import { useEffect } from 'react';
import { useChatStore } from './store/chatStore';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';

export default function Home() {
  const sessions = useChatStore((s) => s.sessions);
  const createSession = useChatStore((s) => s.createSession);

  // 首次加载：如果没有会话，自动创建一个
  useEffect(() => {
    if (sessions.length === 0) {
      createSession();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen">
      <Sidebar />
      <ChatArea />
    </div>
  );
}
