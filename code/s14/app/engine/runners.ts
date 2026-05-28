/**
 * 节点执行器注册表
 *
 * 每种节点类型对应一个 runner 函数。
 * runner 接收上下文（节点数据 + 上游输入），返回输出。
 */

export interface RunContext {
  nodeData: Record<string, unknown>;
  inputs: Record<string, unknown>;
}

export type Runner = (ctx: RunContext) => Promise<unknown>;

// ── 内置 runner ───────────────────────────────────────────

async function inputRunner(ctx: RunContext): Promise<string> {
  return (ctx.nodeData.value as string) || "";
}

async function llmRunner(ctx: RunContext): Promise<string> {
  const prompt = (ctx.inputs.default as string) || (ctx.nodeData.prompt as string) || "";
  const model = (ctx.nodeData.model as string) || "deepseek-chat";

  // 调用本地 API route
  const res = await fetch("/api/execute-node", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model }),
  });

  if (!res.ok) {
    throw new Error(`LLM 调用失败: ${res.status}`);
  }

  const data = await res.json();
  return data.content;
}

async function transformRunner(ctx: RunContext): Promise<string> {
  const input = (ctx.inputs.default as string) || "";
  const template = (ctx.nodeData.template as string) || "";

  if (!template) return input;

  // 简单模板替换：{{input}} 代表上游输入
  return template.replace(/\{\{input\}\}/g, input);
}

async function outputRunner(ctx: RunContext): Promise<string> {
  return (ctx.inputs.default as string) || "";
}

async function conditionRunner(ctx: RunContext): Promise<{ pass: boolean; value: unknown }> {
  const input = ctx.inputs.default;
  const condition = (ctx.nodeData.condition as string) || "truthy";
  const target = ctx.nodeData.target as string;

  let pass = false;

  switch (condition) {
    case "equals":
      pass = String(input) === String(target);
      break;
    case "contains":
      pass = String(input).includes(String(target));
      break;
    case "truthy":
      pass = !!input;
      break;
    case "gt":
      pass = Number(input) > Number(target);
      break;
    case "lt":
      pass = Number(input) < Number(target);
      break;
  }

  return { pass, value: input };
}

// ── 注册表 ────────────────────────────────────────────────

export const runners: Record<string, Runner> = {
  input: inputRunner,
  llm: llmRunner,
  transform: transformRunner,
  output: outputRunner,
  condition: conditionRunner,
};
