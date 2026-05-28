/**
 * Build An Agent - s18: 部署上线
 *
 * 结构化日志工具。
 * 生产环境里，console.log 的输出是散的、不可搜索的。
 * 这个 logger 统一格式，方便接入 Vercel Log Drain 或第三方日志服务。
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function createLogger(requestId?: string) {
  const baseContext: Record<string, unknown> = {};
  if (requestId) baseContext.requestId = requestId;

  function log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: unknown,
  ) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...baseContext, ...context },
    };

    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const formatted = formatEntry(entry);

    switch (level) {
      case "debug":
        if (process.env.NODE_ENV === "development") console.debug(formatted);
        break;
      case "info":
        console.log(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        break;
    }
  }

  return {
    debug: (msg: string, ctx?: Record<string, unknown>) =>
      log("debug", msg, ctx),
    info: (msg: string, ctx?: Record<string, unknown>) =>
      log("info", msg, ctx),
    warn: (msg: string, ctx?: Record<string, unknown>, err?: unknown) =>
      log("warn", msg, ctx, err),
    error: (msg: string, ctx?: Record<string, unknown>, err?: unknown) =>
      log("error", msg, ctx, err),
  };
}

export type Logger = ReturnType<typeof createLogger>;

/** 为每个请求生成唯一 ID，贯穿整条调用链 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export { createLogger };
