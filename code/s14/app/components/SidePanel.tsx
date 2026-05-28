"use client";

import type { Node } from "reactflow";

interface SidePanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: Record<string, unknown>) => void;
}

/**
 * 右侧面板 — 编辑选中节点的属性
 */
export default function SidePanel({ selectedNode, onUpdateNode }: SidePanelProps) {
  if (!selectedNode) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
        点击节点查看属性
      </div>
    );
  }

  const handleChange = (key: string, value: string) => {
    onUpdateNode(selectedNode.id, {
      ...selectedNode.data,
      [key]: value,
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-zinc-200 font-medium mb-1">
          {selectedNode.type?.toUpperCase()} 节点
        </h3>
        <p className="text-zinc-500 text-xs font-mono">{selectedNode.id}</p>
      </div>

      {/* 通用：标签 */}
      <Field
        label="标签"
        value={(selectedNode.data.label as string) || ""}
        onChange={(v) => handleChange("label", v)}
      />

      {/* Input 节点专属 */}
      {selectedNode.type === "input" && (
        <Field
          label="输入值"
          value={(selectedNode.data.value as string) || ""}
          onChange={(v) => handleChange("value", v)}
          multiline
        />
      )}

      {/* LLM 节点专属 */}
      {selectedNode.type === "llm" && (
        <>
          <Field
            label="模型"
            value={(selectedNode.data.model as string) || ""}
            onChange={(v) => handleChange("model", v)}
            placeholder="deepseek-chat"
          />
          <Field
            label="提示词"
            value={(selectedNode.data.prompt as string) || ""}
            onChange={(v) => handleChange("prompt", v)}
            multiline
          />
        </>
      )}

      {/* Transform 节点专属 */}
      {selectedNode.type === "transform" && (
        <Field
          label="模板"
          value={(selectedNode.data.template as string) || ""}
          onChange={(v) => handleChange("template", v)}
          multiline
          placeholder="{{input}}"
        />
      )}

      {/* Condition 节点专属 */}
      {selectedNode.type === "condition" && (
        <>
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">条件</label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200"
              value={(selectedNode.data.condition as string) || "truthy"}
              onChange={(e) => handleChange("condition", e.target.value)}
            >
              <option value="truthy">非空</option>
              <option value="equals">等于</option>
              <option value="contains">包含</option>
              <option value="gt">大于</option>
              <option value="lt">小于</option>
            </select>
          </div>
          <Field
            label="目标值"
            value={(selectedNode.data.target as string) || ""}
            onChange={(v) => handleChange("target", v)}
          />
        </>
      )}
    </div>
  );
}

/** 简单表单字段 */
function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const cls =
    "w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 placeholder-zinc-600";

  return (
    <div>
      <label className="text-zinc-400 text-xs mb-1 block">{label}</label>
      {multiline ? (
        <textarea
          className={cls + " min-h-[80px] resize-y"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={cls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
