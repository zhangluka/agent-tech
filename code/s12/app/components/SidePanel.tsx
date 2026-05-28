import { useReactFlow, type Node } from "@xyflow/react";
import {
  MODELS,
  TOOLS,
  type NodeDataMap,
  type NodeDataType,
  type StartNodeData,
  type LLMNodeData,
  type ToolNodeData,
  type ConditionNodeData,
  type EndNodeData,
} from "../types/nodeTypes";

const OPERATORS: { value: ConditionNodeData["operator"]; label: string }[] = [
  { value: "==", label: "等于" },
  { value: "!=", label: "不等于" },
  { value: ">", label: "大于" },
  { value: "<", label: "小于" },
  { value: "contains", label: "包含" },
  { value: "exists", label: "存在" },
];

interface SidePanelProps {
  selectedNode: Node | null;
  onUpdateNode: (id: string, data: Record<string, unknown>) => void;
}

export default function SidePanel({ selectedNode, onUpdateNode }: SidePanelProps) {
  const { setNodes } = useReactFlow();

  if (!selectedNode) {
    return (
      <div className="w-80 bg-zinc-950 border-l border-zinc-800 flex items-center justify-center text-zinc-600 text-sm">
        点击节点查看配置
      </div>
    );
  }

  const type = selectedNode.type as NodeDataType;
  const data = selectedNode.data as NodeDataMap[NodeDataType];

  function update(patch: Record<string, unknown>) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode!.id
          ? { ...n, data: { ...n.data, ...patch } }
          : n
      )
    );
  }

  return (
    <div className="w-80 bg-zinc-950 border-l border-zinc-800 overflow-y-auto">
      <div className="p-4 border-b border-zinc-800">
        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
          节点配置
        </div>
        <div className="text-white font-medium">{(data as { label: string }).label}</div>
        <div className="text-xs text-zinc-500 mt-0.5">类型: {type}</div>
      </div>

      <div className="p-4 space-y-4">
        {/* 通用：label */}
        <Field label="名称">
          <input
            className="input-field"
            value={(data as { label: string }).label}
            onChange={(e) => update({ label: e.target.value })}
          />
        </Field>

        {/* Start 节点 */}
        {type === "start" && (
          <Field label="输出变量名">
            <input
              className="input-field font-mono"
              value={(data as StartNodeData).variableName}
              onChange={(e) => update({ variableName: e.target.value })}
            />
          </Field>
        )}

        {/* LLM 节点 */}
        {type === "llm" && (
          <>
            <Field label="模型">
              <select
                className="input-field"
                value={(data as LLMNodeData).model}
                onChange={(e) => update({ model: e.target.value })}
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.provider} / {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="System Prompt">
              <textarea
                className="input-field min-h-[100px] resize-y"
                value={(data as LLMNodeData).systemPrompt}
                onChange={(e) => update({ systemPrompt: e.target.value })}
              />
            </Field>
            <Field label={`温度: ${(data as LLMNodeData).temperature}`}>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                className="w-full accent-purple-500"
                value={(data as LLMNodeData).temperature}
                onChange={(e) => update({ temperature: parseFloat(e.target.value) })}
              />
            </Field>
          </>
        )}

        {/* Tool 节点 */}
        {type === "tool" && (
          <>
            <Field label="工具">
              <select
                className="input-field"
                value={(data as ToolNodeData).toolName}
                onChange={(e) => {
                  const tool = TOOLS.find((t) => t.name === e.target.value);
                  update({
                    toolName: e.target.value,
                    args: tool?.defaultArgs ?? {},
                  });
                }}
              >
                {TOOLS.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="text-xs text-zinc-500 -mt-2">
              {TOOLS.find((t) => t.name === (data as ToolNodeData).toolName)?.description}
            </div>
            <Field label="参数">
              <div className="space-y-2">
                {Object.entries((data as ToolNodeData).args).map(([key, val]) => (
                  <div key={key} className="flex gap-2 items-center">
                    <span className="text-xs text-zinc-500 font-mono w-16 shrink-0">
                      {key}
                    </span>
                    <input
                      className="input-field flex-1"
                      value={val}
                      onChange={(e) =>
                        update({
                          args: { ...(data as ToolNodeData).args, [key]: e.target.value },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </Field>
          </>
        )}

        {/* Condition 节点 */}
        {type === "condition" && (
          <>
            <Field label="变量">
              <input
                className="input-field font-mono"
                value={(data as ConditionNodeData).variable}
                onChange={(e) => update({ variable: e.target.value })}
              />
            </Field>
            <Field label="运算符">
              <select
                className="input-field"
                value={(data as ConditionNodeData).operator}
                onChange={(e) => update({ operator: e.target.value })}
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="值">
              <input
                className="input-field"
                value={(data as ConditionNodeData).value}
                onChange={(e) => update({ value: e.target.value })}
              />
            </Field>
          </>
        )}

        {/* End 节点 */}
        {type === "end" && (
          <Field label="输出格式">
            <select
              className="input-field"
              value={(data as EndNodeData).outputFormat}
              onChange={(e) => update({ outputFormat: e.target.value })}
            >
              <option value="text">纯文本</option>
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
            </select>
          </Field>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
