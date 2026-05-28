/**
 * Build An Agent - s17: 错误恢复
 *
 * 重试策略：错误分类 + 指数退避。
 *
 * 核心思路：
 *   1. 先判断错误是"暂时性的"还是"永久性的"
 *   2. 暂时性错误可以重试，永久性错误直接失败
 *   3. 重试间隔按指数增长，避免打爆下游服务
 */

import type { ErrorClassification, NodeError, ErrorRecoveryConfig } from "./types";

/* ── 错误分类 ──────────────────────────────── */

/**
 * 判断一个错误是暂时性的还是永久性的。
 *
 * 暂时性（transient）：网络超时、限流、服务端 5xx —— 重试可能成功。
 * 永久性（permanent）：参数错误、认证失败、404 —— 重试多少次都没用。
 */
export function classifyError(err: unknown): ErrorClassification {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

  // 提取 HTTP 状态码（如果有）
  const statusMatch = message.match(/\b([45]\d{2})\b/);
  const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : undefined;

  // 永久性错误：客户端错误（除了 429 限流）
  if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
    return "permanent";
  }

  // 暂时性错误的关键词
  const transientPatterns = [
    "timeout",
    "timed out",
    "econnreset",
    "econnrefused",
    "socket hang up",
    "429",
    "rate limit",
    "too many requests",
    "500",
    "502",
    "503",
    "504",
    "bad gateway",
    "service unavailable",
    "gateway timeout",
    "internal server error",
    "network error",
    "fetch failed",
  ];

  for (const pattern of transientPatterns) {
    if (message.includes(pattern)) {
      return "transient";
    }
  }

  // 看不出类型的，默认当暂时性处理（宁可多试一次）
  return "unknown";
}

/**
 * 判断某个错误是否应该重试。
 *
 * 规则：
 *   - permanent → 不重试
 *   - transient → 重试
 *   - unknown → 重试（但最多 1 次）
 */
export function shouldRetry(
  classification: ErrorClassification,
  currentAttempt: number,
  config: ErrorRecoveryConfig,
): boolean {
  if (classification === "permanent") return false;
  if (classification === "transient") return currentAttempt < config.maxRetries;
  // unknown：最多重试 1 次
  return currentAttempt < 1;
}

/* ── 指数退避 ──────────────────────────────── */

/**
 * 计算第 n 次重试的等待时间。
 *
 * 公式：min(baseDelay * 2^attempt + jitter, maxDelay)
 *
 * jitter 是一个 0~30% 的随机扰动，防止多个请求同时重试（惊群效应）。
 */
export function calculateDelay(attempt: number, config: ErrorRecoveryConfig): number {
  const exponential = config.baseDelay * Math.pow(2, attempt);
  const jitter = exponential * (0.3 * Math.random());
  return Math.min(exponential + jitter, config.maxDelay);
}

/**
 * 延迟指定毫秒。
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ── 带重试的执行 ──────────────────────────── */

/**
 * 带指数退避重试的执行器。
 *
 * 调用方式：
 *   const result = await retryWithBackoff(
 *     () => fetchFromAPI(),
 *     { maxRetries: 3, baseDelay: 1000, maxDelay: 30000, autoRollback: true },
 *     (err, attempt) => console.log(`第 ${attempt} 次重试，原因: ${err.message}`),
 *   );
 *
 * @param fn        要执行的异步函数
 * @param config    重试配置
 * @param onRetry   每次重试前的回调（用于日志/UI 更新）
 * @returns         fn 的返回值
 * @throws          如果所有重试都失败，抛出最后一个错误
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: ErrorRecoveryConfig,
  onRetry?: (error: NodeError, attempt: number, delay: number) => void,
): Promise<{ result: T; attempts: number; retryHistory: { attempt: number; error: NodeError }[] }> {
  const retryHistory: { attempt: number; error: NodeError }[] = [];
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const result = await fn();
      return { result, attempts: attempt, retryHistory };
    } catch (err) {
      const classification = classifyError(err);
      const nodeError: NodeError = {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        classification,
        statusCode: extractStatusCode(err),
      };

      retryHistory.push({ attempt, error: nodeError });

      if (!shouldRetry(classification, attempt, config)) {
        throw nodeError;
      }

      const delay = calculateDelay(attempt, config);
      onRetry?.(nodeError, attempt, delay);

      await sleep(delay);
      attempt++;
    }
  }
}

/* ── 辅助函数 ──────────────────────────────── */

function extractStatusCode(err: unknown): number | undefined {
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/\b([45]\d{2})\b/);
  return match ? parseInt(match[1], 10) : undefined;
}
