/**
 * Build An Agent - s15: 执行日志
 *
 * 节点运行器。
 * 每种节点类型有一个对应的运行函数。
 * （与 s14 相同，此处保持不变）
 */

/* ── LLM 节点 ─────────────────────────────── */

export async function runLLMNode(
  data: Record<string, unknown>,
  input: unknown,
): Promise<string> {
  const prompt = (data.prompt as string) || "";
  const model = (data.model as string) || "deepseek-chat";

  // 把输入拼进 prompt
  const userContent =
    typeof input === "string" ? input : JSON.stringify(input, null, 2);
  const fullPrompt = prompt
    ? `${prompt}\n\n${userContent}`
    : userContent;

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: fullPrompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM 调用失败: ${res.status}`);
  }

  const json = await res.json();
  return json.content ?? "";
}

/* ── Tool 节点 ────────────────────────────── */

export async function runToolNode(
  data: Record<string, unknown>,
  input: unknown,
): Promise<unknown> {
  const toolName = data.tool as string;
  const params = typeof input === "object" && input !== null
    ? input
    : { value: input };

  const res = await fetch("/api/tools", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool: toolName, params }),
  });

  if (!res.ok) {
    throw new Error(`工具执行失败: ${res.status}`);
  }

  return res.json();
}

/* ── Condition 节点 ───────────────────────── */

export async function runConditionNode(
  data: Record<string, unknown>,
  input: unknown,
): Promise<string> {
  const condition = (data.condition as string) || "";
  const inputStr =
    typeof input === "string" ? input : JSON.stringify(input);

  // 简单的条件求值：检查输入是否包含关键词
  if (condition.startsWith("contains:")) {
    const keyword = condition.slice("contains:".length).trim();
    return inputStr.includes(keyword) ? "true" : "false";
  }

  // 默认通过 LLM 判断
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: `判断以下条件是否成立，只回答 true 或 false。\n条件：${condition}\n输入：${inputStr}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`条件判断失败: ${res.status}`);

  const json = await res.json();
  const answer = (json.content ?? "").trim().toLowerCase();
  return answer.includes("true") ? "true" : "false";
}
