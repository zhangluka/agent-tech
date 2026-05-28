"use client";

/**
 * Build An Agent - s10: 调用可视化
 *
 * 主页面：左侧边栏 + 右侧聊天区域。
 */

import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";

export default function Home() {
  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-100">
      <Sidebar />
      <ChatArea />
    </div>
  );
}
