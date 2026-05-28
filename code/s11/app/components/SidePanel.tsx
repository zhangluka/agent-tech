"use client";

import type { Node } from "@xyflow/react";

const NODE_META: Record<
  string,
  { color: string; icon: string; description: string }
> = {
  start: {
    color: "border-emerald-500",
    icon: "▶",
    description: "工作流的入口。每个工作流只能有一个开始节点。",
  },
  llm: {
    color: "border-blue-500",
    icon: "🧠",
    description: "调用大语言模型处理输入，生成输出。可选择不同的模型。",
  },
  tool: {
    color: "border-orange-500",
    icon: "🔧",
    description: "调用外部工具（搜索、数据库查询、API 调用等）获取信息。",
  },
  end: {
    color: "border-red-500",
    icon: "⏹",
    description: "工作流的出口。执行到这里时，流程结束并返回结果。",
  },
};

interface SidePanelProps {
  node: Node | null;
  onClose: () => void;
}

export default function SidePanel({ node, onClose }: SidePanelProps) {
  if (!node) return null;

  const meta = NODE_META[node.type ?? ""] ?? {
    color: "border-gray-500",
    icon: "❓",
    description: "未知节点类型。",
  };

  const nodeData = node.data as Record<string, string>;

  return (
    <div
      className={`w-80 bg-zinc-900 border-l ${meta.color} h-full overflow-y-auto`}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.icon}</span>
          <span className="font-semibold text-white">
            {nodeData.label || node.type}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition-colors text-lg"
        >
          ✕
        </button>
      </div>

      {/* 属性 */}
      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wider">
            节点 ID
          </label>
          <div className="text-sm text-zinc-300 mt-1 font-mono">{node.id}</div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wider">
            类型
          </label>
          <div className="text-sm text-zinc-300 mt-1">{node.type}</div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wider">
            说明
          </label>
          <div className="text-sm text-zinc-400 mt-1 leading-relaxed">
            {meta.description}
          </div>
        </div>

        {/* 显示节点自定义数据 */}
        {Object.entries(nodeData).map(([key, value]) => (
          <div key={key}>
            <label className="text-xs text-zinc-500 uppercase tracking-wider">
              {key}
            </label>
            <div className="text-sm text-zinc-300 mt-1 font-mono bg-zinc-800 rounded px-3 py-2">
              {value}
            </div>
          </div>
        ))}

        {/* 位置信息 */}
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wider">
            位置
          </label>
          <div className="text-sm text-zinc-300 mt-1 font-mono">
            x: {Math.round(node.position.x)}, y: {Math.round(node.position.y)}
          </div>
        </div>
      </div>
    </div>
  );
}
