/**
 * Build An Agent - s13: 连线与执行
 *
 * 每种节点类型的执行器。
 * 每个 runner 接收节点配置和上下文，返回输出字符串。
 */

import type { FlowNode, ExecutionContext, NodeRunner } from "./types";

/**
 * 模板替换：把 {{nodeId.field}} 替换成上下文里的实际值。
 *
 * 比如 LLM 节点的 prompt 写了 "请总结：{{start.user_input}}"
 * 就会把 {{start.user_input}} 替换成 Start 节点的输出。
 */
function resolveTemplate(template: string, context: ExecutionContext): string {
  return template.replace(/\{\{(\w+)(?:\.(\w+))?\}\}/g, (_, nodeId, field) => {
    const output = context.outputs[nodeId];
    if (!output) return `[${nodeId} 无输出]`;
    // 如果指定了 field，尝试从 JSON 输出中提取
    if (field) {
      try {
        const parsed = JSON.parse(output);
        return parsed[field] ?? `[${nodeId}.${field} 不存在]`;
      } catch {
        return output;
      }
    }
    return output;
  });
}

// ────────────────────────────────────────
// Start 节点：初始化上下文变量
// ────────────────────────────────────────

export class StartRunner implements NodeRunner {
  async run(node: FlowNode, _context: ExecutionContext): Promise<string> {
    // Start 节点的 config.variables 是一个 JSON 字符串
    // 例如 '{"user_input": "帮我总结这篇文章", "language": "中文"}'
    const variables = node.config.variables || "{}";
    try {
      const parsed = JSON.parse(variables);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // 如果不是合法 JSON，直接返回原始字符串
      return variables;
    }
  }
}

// ────────────────────────────────────────
// LLM 节点：调用模型 API
// ────────────────────────────────────────

export class LLMRunner implements NodeRunner {
  async run(node: FlowNode, context: ExecutionContext): Promise<string> {
    const prompt = resolveTemplate(node.config.prompt || "", context);
    const systemPrompt = node.config.system_prompt || "";

    // 调用本地 API route
    const res = await fetch("/api/execute-llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        systemPrompt,
        model: node.config.model || "deepseek-chat",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`LLM 调用失败: ${err}`);
    }

    const data = await res.json();
    return data.content;
  }
}

// ────────────────────────────────────────
// Tool 节点：执行工具
// ────────────────────────────────────────

export class ToolRunner implements NodeRunner {
  async run(node: FlowNode, context: ExecutionContext): Promise<string> {
    const toolName = node.config.tool_name || "echo";
    const argsStr = resolveTemplate(node.config.arguments || "{}", context);

    let args: Record<string, unknown>;
    try {
      args = JSON.parse(argsStr);
    } catch {
      args = { input: argsStr };
    }

    // 调用本地 API route 执行工具
    const res = await fetch("/api/execute-tool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolName, args }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`工具执行失败: ${err}`);
    }

    const data = await res.json();
    return data.result;
  }
}

// ────────────────────────────────────────
// Condition 节点：条件分支
// ────────────────────────────────────────

export class ConditionRunner implements NodeRunner {
  async run(node: FlowNode, context: ExecutionContext): Promise<string> {
    const expression = resolveTemplate(node.config.expression || "true", context);

    // 简单的表达式求值
    // 支持：contains、startsWith、isEmpty、==、!=
    let result = false;

    try {
      // 安全的表达式求值（不用 eval）
      result = evaluateExpression(expression);
    } catch {
      result = false;
    }

    // 返回 "true" 或 "false"，executor 会根据这个选择路径
    return result ? "true" : "false";
  }
}

/**
 * 简单的表达式求值器。
 * 支持的语法：
 *   contains("hello", "ell")  → true
 *   isEmpty("")               → true
 *   "abc" == "abc"            → true
 *   "abc" != "xyz"            → true
 *   1 > 0                     → true
 */
function evaluateExpression(expr: string): boolean {
  const trimmed = expr.trim();

  // contains(a, b)
  const containsMatch = trimmed.match(/^contains\("(.*)",\s*"(.*)"\)$/);
  if (containsMatch) {
    return containsMatch[1].includes(containsMatch[2]);
  }

  // isEmpty(a)
  const isEmptyMatch = trimmed.match(/^isEmpty\("(.*)"\)$/);
  if (isEmptyMatch) {
    return isEmptyMatch[1] === "";
  }

  // startsWith(a, b)
  const startsWithMatch = trimmed.match(/^startsWith\("(.*)",\s*"(.*)"\)$/);
  if (startsWithMatch) {
    return startsWithMatch[1].startsWith(startsWithMatch[2]);
  }

  // 字符串比较 "a" == "b" 或 "a" != "b"
  const strCompareMatch = trimmed.match(/^"(.*)"\s*(==|!=)\s*"(.*)"$/);
  if (strCompareMatch) {
    const [, left, op, right] = strCompareMatch;
    return op === "==" ? left === right : left !== right;
  }

  // 数字比较 1 > 0 等
  const numCompareMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(>|<|>=|<=|==|!=)\s*(\d+(?:\.\d+)?)$/);
  if (numCompareMatch) {
    const [, left, op, right] = numCompareMatch;
    const l = parseFloat(left);
    const r = parseFloat(right);
    switch (op) {
      case ">": return l > r;
      case "<": return l < r;
      case ">=": return l >= r;
      case "<=": return l <= r;
      case "==": return l === r;
      case "!=": return l !== r;
    }
  }

  // 布尔字面量
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  // 如果表达式以 ! 开头，取反
  if (trimmed.startsWith("!")) {
    return !evaluateExpression(trimmed.slice(1));
  }

  // 默认返回 false
  return false;
}

// ────────────────────────────────────────
// End 节点：收集最终输出
// ────────────────────────────────────────

export class EndRunner implements NodeRunner {
  async run(node: FlowNode, context: ExecutionContext): Promise<string> {
    // End 节点从指定的输入节点收集输出
    const sourceId = node.config.source || "";
    if (sourceId && context.outputs[sourceId]) {
      return context.outputs[sourceId];
    }

    // 如果没指定 source，收集所有输出
    return JSON.stringify(context.outputs, null, 2);
  }
}

// ────────────────────────────────────────
// Runner 注册表
// ────────────────────────────────────────

export const runners: Record<string, NodeRunner> = {
  start: new StartRunner(),
  llm: new LLMRunner(),
  tool: new ToolRunner(),
  condition: new ConditionRunner(),
  end: new EndRunner(),
};
