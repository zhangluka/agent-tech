/**
 * Build An Agent - s13: 连线与执行
 *
 * 侧边面板：节点配置编辑器。
 * 选中节点后，在这里编辑它的属性。
 */

"use client";

import { useWorkflowStore } from "../store/workflowStore";

/** 每种节点类型的可配置字段 */
const NODE_FIELDS: Record<string, { key: string; label: string; placeholder: string; multiline?: boolean }[]> = {
  start: [
    { key: "variables", label: "初始变量 (JSON)", placeholder: '{"user_input": "你好"}', multiline: true },
  ],
  llm: [
    { key: "system_prompt", label: "System Prompt", placeholder: "你是一个有帮助的助手", multiline: true },
    { key: "prompt", label: "Prompt", placeholder: "可以用 {{nodeId}} 引用上游输出", multiline: true },
    { key: "model", label: "模型", placeholder: "deepseek-chat" },
  ],
  tool: [
    { key: "tool_name", label: "工具名", placeholder: "read_file / search / echo" },
    { key: "arguments", label: "参数 (JSON)", placeholder: '{"path": "{{start.user_input}}"}', multiline: true },
  ],
  condition: [
    { key: "expression", label: "条件表达式", placeholder: 'contains({{llm.output}}, "是")', multiline: true },
  ],
  end: [
    { key: "source", label: "输出来源 (节点 ID)", placeholder: "留空则收集所有输出" },
  ],
};

export default function SidePanel() {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);

  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
        点击节点查看配置
      </div>
    );
  }

  const fields = NODE_FIELDS[node.type] || [];

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{node.label}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{node.type}</div>
        </div>
        <button
          onClick={() => deleteNode(node.id)}
          className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
        >
          删除
        </button>
      </div>

      {/* 节点名称编辑 */}
      <div className="px-4 py-3 border-b border-zinc-700">
        <label className="text-xs text-zinc-500 block mb-1">节点名称</label>
        <input
          value={node.label}
          onChange={(e) => updateNode(node.id, { label: e.target.value })}
          className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5
                     text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* 节点特定配置 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="text-xs text-zinc-500 block mb-1">{field.label}</label>
            {field.multiline ? (
              <textarea
                value={node.config[field.key] || ""}
                onChange={(e) =>
                  updateNode(node.id, {
                    config: { ...node.config, [field.key]: e.target.value },
                  })
                }
                placeholder={field.placeholder}
                rows={4}
                className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5
                           text-sm text-zinc-100 font-mono focus:outline-none
                           focus:border-blue-500 resize-none"
              />
            ) : (
              <input
                value={node.config[field.key] || ""}
                onChange={(e) =>
                  updateNode(node.id, {
                    config: { ...node.config, [field.key]: e.target.value },
                  })
                }
                placeholder={field.placeholder}
                className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5
                           text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
              />
            )}
          </div>
        ))}
      </div>

      {/* 节点 ID（只读） */}
      <div className="px-4 py-2 border-t border-zinc-700 text-xs text-zinc-600">
        ID: {node.id}
      </div>
    </div>
  );
}
