/**
 * Build An Agent - s17: 错误恢复
 *
 * 节点运行器。
 * 在 s15 基础上增加了回退（fallback）逻辑。
 */

/* ── LLM 节点 ─────────────────────────────── */

export async function runLLMNode(
  data: Record<string, unknown>,
  input: unknown,
): Promise<string> {
  const prompt = (data.prompt as string) || "";
  const model = (data.model as string) || "deepseek-chat";

  const userContent =
    typeof input === "string" ? input : JSON.stringify(input, null, 2);
  const fullPrompt = prompt ? `${prompt}\n\n${userContent}` : userContent;

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
  const params =
    typeof input === "object" && input !== null ? input : { value: input };

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

  if (condition.startsWith("contains:")) {
    const keyword = condition.slice("contains:".length).trim();
    return inputStr.includes(keyword) ? "true" : "false";
  }

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

/* ── 回退工具 ──────────────────────────────── */

/**
 * 工具失败时的回退方案。
 *
 * 不是所有工具都有回退。这里的逻辑是：
 *   - read_file 失败 → 尝试用 search_files 搜文件名
 *   - http_request 失败 → 如果有缓存，返回缓存
 *   - 其他 → 返回 null（没有回退方案）
 *
 * 返回 null 表示没有可用的回退，调用方应该抛出原始错误。
 */
export async function runFallbackTool(
  data: Record<string, unknown>,
  input: unknown,
  _primaryError: unknown,
): Promise<unknown> {
  const toolName = data.tool as string;

  switch (toolName) {
    case "read_file": {
      // read_file 失败（文件不存在？权限？）
      // 回退：用 search_files 搜索同名文件
      const fileName =
        typeof input === "string"
          ? input
          : typeof input === "object" && input !== null && "path" in input
            ? String((input as Record<string, unknown>).path)
            : null;

      if (!fileName) return null;

      try {
        const res = await fetch("/api/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: "search_files",
            params: { pattern: fileName.split("/").pop() },
          }),
        });
        if (res.ok) {
          const result = await res.json();
          return {
            fallback: true,
            originalTool: "read_file",
            message: `文件读取失败，通过搜索找到相关结果`,
            data: result,
          };
        }
      } catch {
        // 回退也失败了，放弃
      }
      return null;
    }

    case "http_request": {
      // HTTP 请求失败
      // 回退：检查是否有缓存版本（这里简化为空实现）
      return null;
    }

    default:
      return null;
  }
}
