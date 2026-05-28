"use client";

/**
 * Build An Agent - s10: 调用可视化
 *
 * 聊天主区域。
 * 处理用户输入、SSE 流式响应、消息渲染（含工具调用卡片）。
 */

import { useState, useRef, useEffect } from "react";
import { useChatStore, type ChatMessage } from "../store/chatStore";
import MarkdownMessage from "./MarkdownMessage";
import ToolCallCard from "./ToolCallCard";

export default function ChatArea() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const sessions = useChatStore((s) => s.sessions);
  const addMessage = useChatStore((s) => s.addMessage);
  const appendToLastMessage = useChatStore((s) => s.appendToLastMessage);
  const addToolCall = useChatStore((s) => s.addToolCall);
  const updateToolCallResult = useChatStore((s) => s.updateToolCallResult);

  const session = sessions.find((s) => s.id === activeSessionId);
  const messages = session?.messages ?? [];

  // 自动滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 自动调整输入框高度
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
    }
  }, [input]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !activeSessionId || loading) return;

    setInput("");

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: text,
    };
    addMessage(activeSessionId, userMsg);

    // 添加助手消息（空内容，后续通过 SSE 追加）
    const assistantId = `msg_${Date.now()}_assistant`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };
    addMessage(activeSessionId, assistantMsg);

    setLoading(true);

    try {
      // 构造发给 API 的消息列表
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) throw new Error(`API 错误：${res.status}`);

      // 解析 SSE 流
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventType = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7);
          } else if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            handleSSEEvent(
              eventType,
              data,
              activeSessionId,
              assistantId,
            );
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误";
      appendToLastMessage(activeSessionId, `\n\n[错误] ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  function handleSSEEvent(
    eventType: string,
    data: Record<string, unknown>,
    sessionId: string,
    assistantMsgId: string,
  ) {
    switch (eventType) {
      case "text_delta":
        appendToLastMessage(sessionId, data.chunk as string);
        break;

      case "tool_call":
        addToolCall(sessionId, assistantMsgId, {
          id: data.id as string,
          name: data.name as string,
          args: data.args as Record<string, unknown>,
          status: "pending",
        });
        break;

      case "tool_result":
        updateToolCallResult(
          sessionId,
          assistantMsgId,
          data.id as string,
          data.result as string,
        );
        break;

      case "error":
        appendToLastMessage(
          sessionId,
          `\n\n[错误] ${data.message}`,
        );
        break;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!activeSessionId) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        创建或选择一个对话开始
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {renderMessage(msg)}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* 输入区域 */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            rows={1}
            className="flex-1 resize-none bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 渲染单条消息。
 * - 用户消息：气泡样式
 * - 助手消息：Markdown + 工具调用卡片
 */
function renderMessage(msg: ChatMessage) {
  if (msg.role === "user") {
    return (
      <div className="bg-zinc-800 text-zinc-100 rounded-2xl px-4 py-3 max-w-[80%] text-sm">
        {msg.content}
      </div>
    );
  }

  // 助手消息：文本 + 工具调用
  const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0;

  return (
    <div className="max-w-[85%]">
      {/* 文本内容 */}
      {msg.content && (
        <div className="text-sm text-zinc-300">
          <MarkdownMessage content={msg.content} />
        </div>
      )}

      {/* 工具调用卡片 */}
      {hasToolCalls && (
        <div className="mt-2 space-y-1">
          {msg.tool_calls!.map((tc) => (
            <ToolCallCard key={tc.id} toolCall={tc} />
          ))}
        </div>
      )}
    </div>
  );
}
