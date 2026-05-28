"use client";

/**
 * Build An Agent - s10: 调用可视化
 *
 * 代码块组件。带语言标签和一键复制按钮。
 */

import { useState } from "react";

interface Props {
  language: string;
  children: string;
}

export default function CodeBlock({ language, children }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative my-2 rounded-lg overflow-hidden border border-zinc-700">
      {/* 头部：语言 + 复制 */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800 text-xs text-zinc-400">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="hover:text-zinc-200 transition-colors"
        >
          {copied ? "已复制" : "复制"}
        </button>
      </div>

      {/* 代码 */}
      <pre className="bg-zinc-950 p-4 overflow-x-auto text-sm leading-relaxed">
        <code className={`language-${language}`}>{children}</code>
      </pre>
    </div>
  );
}
