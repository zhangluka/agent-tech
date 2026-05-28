/**
 * Build An Agent - s10: 调用可视化
 *
 * API route 在服务端执行工具调用循环，通过 SSE 流式推送事件给前端。
 * 事件类型：
 *   - text_delta:  文本片段
 *   - tool_call:   工具开始执行（含工具名和参数）
 *   - tool_result: 工具执行完成（含结果）
 *   - error:       错误信息
 */

import { readFile, readdir } from "fs/promises";
import { resolve, isAbsolute } from "path";

const MODEL = "deepseek-chat";
const MAX_ROUNDS = 10;

// ── 路径安全 ────────────────────────────────────────────

// 项目根目录：code/s10 的上两级就是项目根
const PROJECT_ROOT = resolve(process.cwd(), "..");

function safePath(path: string): string {
  const abs = isAbsolute(path)
    ? resolve(path)
    : resolve(PROJECT_ROOT, path);
  if (!abs.startsWith(PROJECT_ROOT)) {
    throw new Error(`路径越界：${path} 不在项目目录内`);
  }
  return abs;
}

// ── 工具实现 ────────────────────────────────────────────

async function read_file({ path }: { path: string }): Promise<string> {
  const abs = safePath(path);
  const content = await readFile(abs, "utf-8");
  const truncated =
    content.length > 8000 ? content.slice(0, 8000) + "\n...(已截断)" : content;
  return truncated;
}

async function list_files({ path = "." }: { path?: string }): Promise<string> {
  const abs = safePath(path);
  const entries = await readdir(abs, { withFileTypes: true });
  return entries
    .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
    .sort()
    .join("\n");
}

// ── 工具注册表 ──────────────────────────────────────────

type ToolFunc = (args: Record<string, unknown>) => Promise<string>;

const TOOL_REGISTRY: Record<string, ToolFunc> = {
  read_file: read_file as ToolFunc,
  list_files: list_files as ToolFunc,
};

async function dispatchTool(name: string, args: Record<string, unknown>): Promise<string> {
  const fn = TOOL_REGISTRY[name];
  if (!fn) return `错误：未知工具 ${name}`;
  try {
    return await fn(args);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return `错误：${msg}`;
  }
}

// ── 工具定义（给模型看的说明书） ────────────────────────

const tools = [
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "读取指定路径的文件内容",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "文件路径，相对于项目根目录" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_files",
      description: "列出指定目录下的文件和子目录",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "目录路径，相对于项目根目录，默认为项目根目录",
          },
        },
        required: [],
      },
    },
  },
];

// ── 类型定义 ────────────────────────────────────────────

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
}

interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
}

interface StreamSink {
  push(e: SSEEvent): void;
}

// ── 流式输出文本（跟 s07 一样） ────────────────────────

async function streamTextContent(
  content: string,
  sink: StreamSink,
): Promise<void> {
  const chars = content.split("");
  let i = 0;
  while (i < chars.length) {
    const chunk = chars.slice(i, i + 3).join("");
    sink.push({ event: "text_delta", data: { chunk } });
    i += 3;
    await new Promise((r) => setTimeout(r, 15));
  }
}

// ── 工具调用循环 ────────────────────────────────────────

async function runWithTools(messages: Message[], sink: StreamSink) {
  // 动态导入 openai，避免 edge runtime 的兼容问题
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools,
    });

    const msg = response.choices[0].message;

    // 模型直接回复，没调工具 → 流式输出文本，结束
    if (!msg.tool_calls) {
      if (msg.content) {
        await streamTextContent(msg.content, sink);
      }
      return;
    }

    // 模型调了工具 → 逐个执行
    // 把 assistant 消息加入历史（API 要求 tool 消息前有对应的 assistant 消息）
    messages.push({
      role: "assistant",
      content: msg.content ?? null,
      tool_calls: msg.tool_calls,
    });

    for (const tc of msg.tool_calls) {
      const name = tc.function.name;
      const args = JSON.parse(tc.function.arguments);

      // 通知前端：工具开始执行
      sink.push({
        event: "tool_call",
        data: { id: tc.id, name, args },
      });

      // 执行工具
      const result = await dispatchTool(name, args);

      // 通知前端：工具执行完成
      sink.push({
        event: "tool_result",
        data: { id: tc.id, result },
      });

      // 结果送回模型
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: result,
      });
    }
    // 继续循环 → 模型会看到工具结果，决定下一步
  }

  // 跑满了 MAX_ROUNDS 还没结束
  sink.push({
    event: "error",
    data: { message: `达到最大轮次 ${MAX_ROUNDS}，停止执行。` },
  });
}

// ── API Route ───────────────────────────────────────────

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: Message[] };

  const encoder = new TextEncoder();
  const queue: string[] = [];
  let resolve: (() => void) | null = null;
  let done = false;

  // StreamSink：往队列里推事件
  const sink: StreamSink = {
    push(e: SSEEvent) {
      queue.push(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`);
      resolve?.();
    },
  };

  const stream = new ReadableStream({
    async start(controller) {
      // 把 system prompt 插到消息最前面
      const allMessages: Message[] = [
        {
          role: "system",
          content:
            "你是一个有文件访问能力的助手。可以用工具查看项目文件。回答简洁明了。",
        },
        ...messages,
      ];

      try {
        await runWithTools(allMessages, sink);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        sink.push({ event: "error", data: { message: msg } });
      }

      // 推送结束标记
      sink.push({ event: "done", data: {} });
      done = true;
      resolve?.();

      // 消费队列
      while (!done || queue.length > 0) {
        if (queue.length === 0) {
          await new Promise<void>((r) => (resolve = r));
        }
        while (queue.length > 0) {
          controller.enqueue(encoder.encode(queue.shift()));
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
