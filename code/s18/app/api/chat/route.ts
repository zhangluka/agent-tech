/**
 * Build An Agent - s18: 部署上线
 *
 * 聊天 API Route。
 * 在 s10 基础上增加了：
 *   - 请求体校验（输入太长就拒绝）
 *   - 结构化日志
 *   - 错误分类（不把 500 原样丢给前端）
 *   - 超时保护
 */

import { createLogger, generateRequestId } from "../../utils/logger";

const MODEL = process.env.MODEL_NAME || "deepseek-chat";
const MAX_ROUNDS = 10;
const MAX_MESSAGE_LENGTH = 8000;
const MAX_MESSAGES = 50;
const REQUEST_TIMEOUT = 55_000; // 55 秒（Vercel free tier 最大 60s）

// ── 工具实现 ────────────────────────────────────────────

async function read_file({ path }: { path: string }): Promise<string> {
  const { readFile } = await import("fs/promises");
  const { resolve, isAbsolute } = await import("path");

  const projectRoot = resolve(process.cwd(), "..");
  const abs = isAbsolute(path) ? resolve(path) : resolve(projectRoot, path);

  if (!abs.startsWith(projectRoot)) {
    throw new Error("路径越界");
  }

  const content = await readFile(abs, "utf-8");
  return content.length > 8000
    ? content.slice(0, 8000) + "\n...(已截断)"
    : content;
}

async function list_files({ path = "." }: { path?: string }): Promise<string> {
  const { readdir } = await import("fs/promises");
  const { resolve, isAbsolute } = await import("path");

  const projectRoot = resolve(process.cwd(), "..");
  const abs = isAbsolute(path) ? resolve(path) : resolve(projectRoot, path);

  if (!abs.startsWith(projectRoot)) {
    throw new Error("路径越界");
  }

  const entries = await readdir(abs, { withFileTypes: true });
  return entries
    .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
    .sort()
    .join("\n");
}

type ToolFunc = (args: Record<string, unknown>) => Promise<string>;

const TOOL_REGISTRY: Record<string, ToolFunc> = {
  read_file: read_file as ToolFunc,
  list_files: list_files as ToolFunc,
};

async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const fn = TOOL_REGISTRY[name];
  if (!fn) return `错误：未知工具 ${name}`;
  try {
    return await fn(args);
  } catch (e: unknown) {
    return `错误：${e instanceof Error ? e.message : String(e)}`;
  }
}

const tools = [
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "读取指定路径的文件内容",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "文件路径" },
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
          path: { type: "string", description: "目录路径" },
        },
        required: [],
      },
    },
  },
];

// ── 类型 ────────────────────────────────────────────────

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

// ── 输入校验 ────────────────────────────────────────────

function validateMessages(
  messages: unknown,
): { valid: true; messages: Message[] } | { valid: false; error: string } {
  if (!Array.isArray(messages)) {
    return { valid: false, error: "messages 必须是数组" };
  }
  if (messages.length === 0) {
    return { valid: false, error: "messages 不能为空" };
  }
  if (messages.length > MAX_MESSAGES) {
    return {
      valid: false,
      error: `消息数量超过上限（最多 ${MAX_MESSAGES} 条）`,
    };
  }

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") {
      return { valid: false, error: "消息格式错误" };
    }
    if (!["user", "assistant", "system", "tool"].includes(msg.role)) {
      return { valid: false, error: `无效的消息角色: ${msg.role}` };
    }
    if (
      typeof msg.content === "string" &&
      msg.content.length > MAX_MESSAGE_LENGTH
    ) {
      return {
        valid: false,
        error: `单条消息超过 ${MAX_MESSAGE_LENGTH} 字符上限`,
      };
    }
  }

  return { valid: true, messages: messages as Message[] };
}

// ── 流式输出 ────────────────────────────────────────────

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

async function runWithTools(
  messages: Message[],
  sink: StreamSink,
  logger: ReturnType<typeof createLogger>,
) {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });

  for (let round = 0; round < MAX_ROUNDS; round++) {
    logger.info("LLM 调用", { round, messageCount: messages.length });

    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools,
    });

    const msg = response.choices[0].message;

    if (!msg.tool_calls) {
      if (msg.content) {
        await streamTextContent(msg.content, sink);
      }
      logger.info("对话完成", { rounds: round + 1 });
      return;
    }

    messages.push({
      role: "assistant",
      content: msg.content ?? null,
      tool_calls: msg.tool_calls,
    });

    for (const tc of msg.tool_calls) {
      const name = tc.function.name;
      const args = JSON.parse(tc.function.arguments);

      sink.push({ event: "tool_call", data: { id: tc.id, name, args } });

      logger.info("执行工具", { tool: name, args });
      const result = await dispatchTool(name, args);
      logger.info("工具完成", { tool: name, resultLength: result.length });

      sink.push({ event: "tool_result", data: { id: tc.id, result } });

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: result,
      });
    }
  }

  sink.push({
    event: "error",
    data: { message: `达到最大轮次 ${MAX_ROUNDS}，停止执行。` },
  });
}

// ── API Route ───────────────────────────────────────────

export async function POST(req: Request) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  logger.info("收到聊天请求");

  // 超时保护
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT);

  try {
    // 解析请求体
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      logger.warn("请求体解析失败");
      return new Response(
        JSON.stringify({ error: "请求格式错误" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // 校验输入
    const validation = validateMessages((body as Record<string, unknown>)?.messages);
    if (!validation.valid) {
      logger.warn("输入校验失败", { error: validation.error });
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const encoder = new TextEncoder();
    const queue: string[] = [];
    let resolve: (() => void) | null = null;
    let done = false;

    const sink: StreamSink = {
      push(e: SSEEvent) {
        queue.push(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`);
        resolve?.();
      },
    };

    const stream = new ReadableStream({
      async start(controller) {
        const allMessages: Message[] = [
          {
            role: "system",
            content:
              "你是一个有文件访问能力的助手。可以用工具查看项目文件。回答简洁明了。",
          },
          ...validation.messages,
        ];

        try {
          await Promise.race([
            runWithTools(allMessages, sink, logger),
            new Promise((_, reject) => {
              timeout.addEventListener("abort", () =>
                reject(new Error("请求超时")),
              );
            }),
          ]);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          logger.error("请求处理失败", { error: msg }, e);
          sink.push({ event: "error", data: { message: msg } });
        }

        sink.push({ event: "done", data: {} });
        done = true;
        resolve?.();

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
        "X-Request-Id": requestId,
      },
    });
  } catch (e: unknown) {
    logger.error("未捕获错误", {}, e);
    return new Response(
      JSON.stringify({ error: "服务内部错误" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
