export type ModelId = "deepseek-chat" | "gpt-4o" | "claude-3-5-sonnet";

export interface ModelOption {
  id: ModelId;
  label: string;
  provider: string;
}

export const MODELS: ModelOption[] = [
  { id: "deepseek-chat", label: "DeepSeek Chat", provider: "DeepSeek" },
  { id: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet", provider: "Anthropic" },
];

export type ToolName = "read_file" | "list_files" | "search_files";

export interface ToolOption {
  name: ToolName;
  label: string;
  description: string;
  defaultArgs: Record<string, string>;
}

export const TOOLS: ToolOption[] = [
  {
    name: "read_file",
    label: "读取文件",
    description: "读取指定路径的文件内容",
    defaultArgs: { path: "" },
  },
  {
    name: "list_files",
    label: "列出文件",
    description: "列出目录下的所有文件",
    defaultArgs: { directory: "." },
  },
  {
    name: "search_files",
    label: "搜索文件",
    description: "在文件中搜索关键词",
    defaultArgs: { query: "", directory: "." },
  },
];

export interface StartNodeData {
  label: string;
  variableName: string;
}

export interface LLMNodeData {
  label: string;
  model: ModelId;
  systemPrompt: string;
  temperature: number;
}

export interface ToolNodeData {
  label: string;
  toolName: ToolName;
  args: Record<string, string>;
}

export interface ConditionNodeData {
  label: string;
  variable: string;
  operator: "==" | "!=" | ">" | "<" | "contains" | "exists";
  value: string;
}

export interface EndNodeData {
  label: string;
  outputFormat: "text" | "json" | "markdown";
}

export type NodeDataMap = {
  start: StartNodeData;
  llm: LLMNodeData;
  tool: ToolNodeData;
  condition: ConditionNodeData;
  end: EndNodeData;
};

export type NodeDataType = keyof NodeDataMap;

export function getDefaultData(type: NodeDataType): NodeDataMap[NodeDataType] {
  switch (type) {
    case "start":
      return { label: "Start", variableName: "input" };
    case "llm":
      return {
        label: "LLM",
        model: "deepseek-chat",
        systemPrompt: "你是一个有帮助的助手。",
        temperature: 0.7,
      };
    case "tool":
      return {
        label: "Tool",
        toolName: "read_file",
        args: { path: "" },
      };
    case "condition":
      return {
        label: "Condition",
        variable: "input",
        operator: "==",
        value: "",
      };
    case "end":
      return { label: "End", outputFormat: "text" };
  }
}
