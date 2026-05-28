/**
 * Build An Agent - s17: 错误恢复
 *
 * 错误横幅组件。
 * 当节点执行失败时，在画布上方显示错误信息和操作按钮。
 * 用户可以选择：重试、跳过、终止。
 *
 * 设计原则：
 *   - 错误信息用人话写，不是堆栈
 *   - 按钮按危险程度从左到右排列（重试 < 跳过 < 终止）
 *   - 自动重试时显示倒计时
 */

"use client";

import { useState, useEffect } from "react";
import type { NodeError, ErrorAction } from "../engine/types";

interface Props {
  /** 出错的节点 ID */
  nodeId: string;
  /** 错误详情 */
  error: NodeError;
  /** 当前重试次数 */
  attempt: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 用户选择动作后的回调 */
  onAction: (action: ErrorAction) => void;
  /** 关闭横幅（等同于 abort） */
  onClose: () => void;
}

export default function ErrorBanner({
  nodeId,
  error,
  attempt,
  maxRetries = 3,
  onAction,
  onClose,
}: Props) {
  const [countdown, setCountdown] = useState<number | null>(null);

  // 如果是暂时性错误且还有重试次数，开始倒计时
  useEffect(() => {
    if (error.classification === "transient" && attempt < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      const seconds = Math.ceil(delay / 1000);
      setCountdown(seconds);

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
    setCountdown(null);
  }, [error.classification, attempt, maxRetries]);

  const isTransient = error.classification === "transient";
  const canRetry = attempt < maxRetries;

  return (
    <div className="absolute top-0 left-0 right-0 z-50 animate-slideDown">
      <div className="mx-4 mt-2 rounded-lg border border-red-800 bg-red-950/90 backdrop-blur-sm shadow-xl">
        <div className="px-4 py-3">
          {/* 头部：错误类型 + 关闭按钮 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-sm font-medium text-red-200">
                节点执行失败
              </span>
              <span className="text-xs text-red-400/60 font-mono">
                {nodeId}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-red-400/60 hover:text-red-300 transition-colors text-xs"
            >
              x
            </button>
          </div>

          {/* 错误信息 */}
          <div className="text-sm text-red-200/80 mb-3">
            {formatErrorMessage(error)}
          </div>

          {/* 重试信息 */}
          {isTransient && canRetry && (
            <div className="text-xs text-red-400/60 mb-3">
              暂时性错误，可重试。已重试 {attempt} 次，最多 {maxRetries} 次。
              {countdown !== null && (
                <span className="ml-1 text-red-300">
                  {countdown} 秒后自动重试...
                </span>
              )}
            </div>
          )}

          {!isTransient && (
            <div className="text-xs text-red-400/60 mb-3">
              永久性错误，重试不会解决问题。请检查输入或配置。
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2">
            {isTransient && canRetry && (
              <button
                onClick={() => onAction("retry")}
                className="px-3 py-1.5 text-xs font-medium rounded bg-red-800/50 text-red-200 hover:bg-red-700/50 transition-colors border border-red-700/50"
              >
                重试
              </button>
            )}

            <button
              onClick={() => onAction("skip")}
              className="px-3 py-1.5 text-xs font-medium rounded bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 transition-colors border border-zinc-700/50"
            >
              跳过此节点
            </button>

            <button
              onClick={() => onAction("abort")}
              className="px-3 py-1.5 text-xs font-medium rounded bg-red-900/80 text-red-200 hover:bg-red-800/80 transition-colors border border-red-800/50"
            >
              终止执行
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 辅助函数 ──────────────────────────────── */

/**
 * 把技术错误翻译成人话。
 */
function formatErrorMessage(error: NodeError): string {
  const msg = error.message;

  // 常见错误的友好翻译
  if (msg.includes("429") || msg.includes("rate limit")) {
    return "请求太频繁，API 限流了。稍等几秒再试应该就好了。";
  }
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return "请求超时了。可能是网络问题，也可能是模型思考太久。";
  }
  if (msg.includes("500") || msg.includes("internal server error")) {
    return "服务端出错了。这不是你的问题，重试通常能解决。";
  }
  if (msg.includes("502") || msg.includes("bad gateway")) {
    return "网关错误。上游服务可能正在重启，等一下再试。";
  }
  if (msg.includes("503") || msg.includes("service unavailable")) {
    return "服务暂时不可用。可能在维护中，稍后再试。";
  }
  if (msg.includes("401") || msg.includes("unauthorized")) {
    return "认证失败。请检查 API Key 是否正确配置。";
  }
  if (msg.includes("404")) {
    return "资源不存在。请检查工具名称或文件路径是否正确。";
  }

  // 其他错误，原样显示但截断
  return msg.length > 120 ? msg.slice(0, 120) + "..." : msg;
}
