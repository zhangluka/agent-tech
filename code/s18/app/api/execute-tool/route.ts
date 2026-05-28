/**
 * Build An Agent - s18: 部署上线
 *
 * 工具执行 API Route。
 * 供工作流引擎调用，在服务端执行工具，返回结果。
 * 增加了：输入消毒（防注入）、路径安全校验、结构化日志。
 */

import { readFile, readdir } from "fs/promises";
import { resolve, isAbsolute } from "path";
import { createLogger, generateRequestId } from "../../utils/logger";

const PROJECT_ROOT = resolve(process.cwd(), "..");

// ── 路径安全 ────────────────────────────────────────────

function safePath(path: string): string {
  // 去掉空字节（防 null byte injection）
  const clean = path.replace(/\0/g, "");
  const abs = isAbsolute(clean) ? resolve(clean) : resolve(PROJECT_ROOT, clean);
  if (!abs.startsWith(PROJECT_ROOT)) {
    throw new Error(`路径越界：${path} 不在项目目录内`);
  }
  return abs;
}

// ── 工具实现 ────────────────────────────────────────────

async function read_file({ path }: { path: string }): Promise<string> {
  if (typeof path !== "string" || path.trim().length === 0) {
    throw new Error("path 参数必须是非空字符串");
  }
  const abs = safePath(path);
  const content = await readFile(abs, "utf-8");
  return content.length > 8000
    ? content.slice(0, 8000) + "\n...(已截断)"
    : content;
}

async function list_files({ path = "." }: { path?: string }): Promise<string> {
  const abs = safePath(path);
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

// ── 输入校验 ────────────────────────────────────────────

interface RequestBody {
  tool: string;
  args: Record<string, unknown>;
}

function validate(body: unknown): { valid: true; data: RequestBody } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "请求体格式错误" };
  }
  const { tool, args } = body as Record<string, unknown>;
  if (typeof tool !== "string" || tool.trim().length === 0) {
    return { valid: false, error: "tool 参数缺失" };
  }
  // 工具名只能是字母、数字、下划线
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tool)) {
    return { valid: false, error: "工具名格式非法" };
  }
  if (!args || typeof args !== "object") {
    return { valid: false, error: "args 参数必须是对象" };
  }
  return { valid: true, data: { tool, args: args as Record<string, unknown> } };
}

// ── API Route ───────────────────────────────────────────

export async function POST(req: Request) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  logger.info("收到工具执行请求");

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

    const { tool, args } = validation.data;
    const fn = TOOL_REGISTRY[tool];

    if (!fn) {
      logger.warn("未知工具", { tool });
      return new Response(
        JSON.stringify({ error: `未知工具: ${tool}` }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    logger.info("执行工具", { tool, args });
    const result = await fn(args);
    logger.info("工具完成", { tool, resultLength: result.length });

    return new Response(JSON.stringify({ result }), {
      headers: { "Content-Type": "application/json", "X-Request-Id": requestId },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("工具执行失败", {}, e);

    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
