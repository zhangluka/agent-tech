/**
 * Build An Agent - s18: 部署上线
 *
 * LLM 执行 API Route。
 * 供工作流引擎调用，发送 prompt 给模型，返回文本结果。
 * 增加了：输入校验、超时保护、结构化日志。
 */

import { createLogger, generateRequestId } from "../../utils/logger";

const MODEL = process.env.MODEL_NAME || "deepseek-chat";
const MAX_PROMPT_LENGTH = 12000;
const REQUEST_TIMEOUT = 25_000;

interface RequestBody {
  prompt: string;
  model?: string;
  systemPrompt?: string;
}

function validate(body: unknown): { valid: true; data: RequestBody } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "请求体格式错误" };
  }
  const { prompt } = body as Record<string, unknown>;
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return { valid: false, error: "prompt 不能为空" };
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { valid: false, error: `prompt 超过 ${MAX_PROMPT_LENGTH} 字符上限` };
  }
  return { valid: true, data: body as RequestBody };
}

export async function POST(req: Request) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  logger.info("收到 LLM 执行请求");

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "请求格式错误" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const validation = validate(body);
    if (!validation.valid) {
      logger.warn("输入校验失败", { error: validation.error });
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { prompt, model, systemPrompt } = validation.data;
    const useModel = model || MODEL;

    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });

    logger.info("调用 LLM", { model: useModel, promptLength: prompt.length });

    const response = await Promise.race([
      client.chat.completions.create({
        model: useModel,
        messages: [
          {
            role: "system",
            content: systemPrompt || "你是一个有用的助手。回答简洁明了。",
          },
          { role: "user", content: prompt },
        ],
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("LLM 调用超时")), REQUEST_TIMEOUT),
      ),
    ]);

    const content = (response as Awaited<typeof response>).choices[0].message.content || "";
    logger.info("LLM 返回", { responseLength: content.length });

    return new Response(JSON.stringify({ content }), {
      headers: { "Content-Type": "application/json", "X-Request-Id": requestId },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("LLM 执行失败", {}, e);

    const status = msg.includes("超时") ? 504 : 500;
    return new Response(
      JSON.stringify({ error: msg }),
      { status, headers: { "Content-Type": "application/json" } },
    );
  }
}
