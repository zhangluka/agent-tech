/**
 * Build An Agent - s18: 部署上线
 *
 * 错误横幅组件。
 * s17 引入了错误恢复机制，这里复用它的 ErrorBanner。
 * 在生产环境中，错误信息需要对用户友好，同时不能泄露内部细节。
 */

"use client";

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export default function ErrorBanner({
  message,
  onDismiss,
  onRetry,
}: ErrorBannerProps) {
  // 生产环境下，把技术性错误翻译成用户能理解的语言
  const userMessage = sanitizeError(message);

  return (
    <div className="mx-4 mt-3 rounded-lg border border-red-800/50 bg-red-950/50 px-4 py-3 flex items-start gap-3">
      <span className="text-red-400 text-sm mt-0.5">!</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-200">{userMessage}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-red-300 hover:text-red-100 px-2 py-1 rounded border border-red-800/50 hover:border-red-700/50 transition-colors"
          >
            重试
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-red-400 hover:text-red-200 px-2 py-1"
          >
            关闭
          </button>
        )}
      </div>
    </div>
  );
}

/** 把技术错误翻译成用户友好的消息 */
function sanitizeError(raw: string): string {
  // API key 相关
  if (raw.includes("401") || raw.includes("Unauthorized") || raw.includes("API key")) {
    return "服务暂时不可用，请稍后再试。";
  }

  // Rate limit
  if (raw.includes("429") || raw.includes("rate limit") || raw.includes("频繁")) {
    return "请求太频繁了，请等几秒再试。";
  }

  // 网络问题
  if (raw.includes("fetch") || raw.includes("network") || raw.includes("ECONNREFUSED")) {
    return "网络连接出了问题，请检查网络后重试。";
  }

  // 超时
  if (raw.includes("timeout") || raw.includes("超时")) {
    return "请求超时了，可能是模型响应太慢，请重试。";
  }

  // 未知错误 → 不暴露细节
  if (raw.includes("INTERNAL") || raw.includes("500")) {
    return "服务出了点问题，请稍后再试。";
  }

  // 其他：原样返回（开发阶段方便调试）
  if (process.env.NODE_ENV === "development") {
    return raw;
  }

  return "出了点问题，请重试。";
}
