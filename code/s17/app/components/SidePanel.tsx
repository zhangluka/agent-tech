/**
 * Build An Agent - s17: 错误恢复
 *
 * 左侧面板：节点库 + 属性编辑。
 * 与 s15 基本相同。
 */

"use client";

import { useState } from "react";
import type { WorkflowNode } from "../engine/types";

interface SidePanelProps {
  selectedNode: WorkflowNode | null;
  onUpdateNode: (id: string, data: Record<string, unknown>) => void;
}

const NODE_TYPES = [
  { type: "input", label: "输入", color: "bg-sky-500", icon: "->" },
  { type: "llm", label: "LLM", color: "bg-violet-500", icon: "AI" },
  { type: "tool", label: "工具", color: "bg-emerald-500", icon: "T" },
  { type: "condition", label: "条件", color: "bg-amber-500", icon: "?" },
  { type: "output", label: "输出", color: "bg-sky-500", icon: "<-" },
];

export default function SidePanel({ selectedNode, onUpdateNode }: SidePanelProps) {
  return (
    <div className="w-60 border-r border-zinc-800 bg-zinc-900 flex flex-col h-full">
      {/* 节点库 */}
      <div className="p-3 border-b border-zinc-800">
        <div className="text-xs text-zinc-500 mb-2">节点库</div>
        <div className="grid grid-cols-2 gap-2">
          {NODE_TYPES.map((nt) => (
            <div
              key={nt.type}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("nodeType", nt.type)}
              className="flex items-center gap-2 px-2 py-1.5 rounded border border-zinc-700 bg-zinc-800 cursor-grab hover:border-zinc-500 transition-colors text-xs"
            >
              <div
                className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white ${nt.color}`}
              >
                {nt.icon}
              </div>
              <span className="text-zinc-300">{nt.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 属性编辑 */}
      <div className="flex-1 p-3 overflow-y-auto">
        {selectedNode ? (
          <NodeEditor node={selectedNode} onUpdate={onUpdateNode} />
        ) : (
          <div className="text-xs text-zinc-600 text-center mt-8">
            选中节点以编辑属性
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 节点编辑器 ────────────────────────────── */

function NodeEditor({
  node,
  onUpdate,
}: {
  node: WorkflowNode;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
}) {
  const [label, setLabel] = useState((node.data.label as string) || "");

  function handleLabelChange(val: string) {
    setLabel(val);
    onUpdate(node.id, { ...node.data, label: val });
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-zinc-500">属性编辑</div>

      <div>
        <label className="text-xs text-zinc-400 block mb-1">标签</label>
        <input
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
        />
      </div>

      {node.type === "llm" && <LLMEditor node={node} onUpdate={onUpdate} />}
      {node.type === "tool" && <ToolEditor node={node} onUpdate={onUpdate} />}
      {node.type === "condition" && (
        <ConditionEditor node={node} onUpdate={onUpdate} />
      )}

      <div className="pt-2 border-t border-zinc-800">
        <div className="text-[10px] text-zinc-600">ID: {node.id}</div>
        <div className="text-[10px] text-zinc-600">类型: {node.type}</div>
      </div>
    </div>
  );
}

function LLMEditor({
  node,
  onUpdate,
}: {
  node: WorkflowNode;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
}) {
  return (
    <>
      <div>
        <label className="text-xs text-zinc-400 block mb-1">模型</label>
        <select
          value={(node.data.model as string) || "deepseek-chat"}
          onChange={(e) =>
            onUpdate(node.id, { ...node.data, model: e.target.value })
          }
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100"
        >
          <option value="deepseek-chat">DeepSeek Chat</option>
          <option value="deepseek-reasoner">DeepSeek Reasoner</option>
          <option value="gpt-4o">GPT-4o</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-zinc-400 block mb-1">Prompt</label>
        <textarea
          value={(node.data.prompt as string) || ""}
          onChange={(e) =>
            onUpdate(node.id, { ...node.data, prompt: e.target.value })
          }
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 resize-none"
          placeholder="系统提示词..."
        />
      </div>
    </>
  );
}

function ToolEditor({
  node,
  onUpdate,
}: {
  node: WorkflowNode;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
}) {
  return (
    <div>
      <label className="text-xs text-zinc-400 block mb-1">工具</label>
      <select
        value={(node.data.tool as string) || "read_file"}
        onChange={(e) =>
          onUpdate(node.id, { ...node.data, tool: e.target.value })
        }
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100"
      >
        <option value="read_file">read_file</option>
        <option value="list_files">list_files</option>
        <option value="search">search</option>
        <option value="http_request">http_request</option>
      </select>
    </div>
  );
}

function ConditionEditor({
  node,
  onUpdate,
}: {
  node: WorkflowNode;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
}) {
  return (
    <div>
      <label className="text-xs text-zinc-400 block mb-1">条件</label>
      <input
        value={(node.data.condition as string) || ""}
        onChange={(e) =>
          onUpdate(node.id, { ...node.data, condition: e.target.value })
        }
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100"
        placeholder="contains:error"
      />
      <div className="text-[10px] text-zinc-600 mt-1">
        前缀 contains: 做关键词匹配，其他用 LLM 判断
      </div>
    </div>
  );
}
