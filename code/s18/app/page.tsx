/**
 * Build An Agent - s18: 部署上线
 *
 * 主页面：聊天界面。
 * 和 s17 相同的结构，增加了生产就绪的错误处理：
 *   - ErrorBanner 组件展示用户友好的错误信息
 *   - 请求失败时支持重试
 *   - 网络断开时的降级提示
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ErrorBanner from "./components/ErrorBanner";

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);

    const assistantMessage: Message = {
      role: "assistant",
      content: "",
      toolCalls: [],
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setLoading(true);

    try {
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `请求失败 (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const event = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (event === "text_delta") {
              assistantMessage.content += data.chunk;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...assistantMessage };
                return updated;
              });
            } else if (event === "tool_call") {
              assistantMessage.toolCalls?.push({
                id: data.id,
                name: data.name,
                args: data.args,
              });
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...assistantMessage };
                return updated;
              });
            } else if (event === "tool_result") {
              const tc = assistantMessage.toolCalls?.find(
                (t) => t.id === data.id,
              );
              if (tc) tc.result = data.result;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...assistantMessage };
                return updated;
              });
            } else if (event === "error") {
              throw new Error(data.message);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "无法读取响应流") {
              throw e;
            }
          }
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "未知错误";
      setError(msg);
      // 移除空的 assistant 消息
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleRetry = useCallback(() => {
    setError(null);
    // 重新发送最后一条用户消息
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      setInput(lastUserMsg.content);
      // 移除最后的 assistant 消息
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev.slice(0, -1);
        return prev;
      });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* 标题栏 */}
      <header className="h-12 border-b border-zinc-800 flex items-center px-4 shrink-0">
        <h1 className="text-sm font-medium">Build An Agent</h1>
        <span className="text-xs text-zinc-500 ml-2">s18 部署上线</span>
      </header>

      {/* 错误横幅 */}
      {error && (
        <ErrorBanner
          message={error}
          onDismiss={() => setError(null)}
          onRetry={handleRetry}
        />
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 mt-20">
            <p className="text-lg">Build An Agent</p>
            <p className="text-sm mt-2">发一条消息开始对话</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-100"
              }`}
            >
              {/* 工具调用 */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.toolCalls.map((tc) => (
                    <div
                      key={tc.id}
                      className="text-xs bg-zinc-700/50 rounded px-2 py-1"
                    >
                      <span className="text-zinc-400">调用 </span>
                      <span className="text-amber-400">{tc.name}</span>
                      {tc.result && (
                        <span className="text-zinc-500 ml-1">
                          ({tc.result.length} 字符)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 文本内容 */}
              <div className="text-sm whitespace-pre-wrap">
                {msg.content || (msg.role === "assistant" && loading ? "..." : "")}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区 */}
      <div className="border-t border-zinc-800 p-4 shrink-0">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="输入消息..."
            disabled={loading}
            className="flex-1 bg-zinc-800 text-zinc-100 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-50 placeholder:text-zinc-500"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-white text-zinc-900 rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "发送"}
          </button>
        </div>
      </div>
    </div>
  );
}
