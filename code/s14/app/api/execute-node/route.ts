import { NextRequest, NextResponse } from "next/server";

/**
 * /api/execute-node
 *
 * 接收 { prompt, model }，调用 LLM API，返回 { content }。
 * 供工作流中的 LLM 节点使用。
 */
export async function POST(req: NextRequest) {
  const { prompt, model } = await req.json();

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPSEEK_API_KEY 未设置" },
      { status: 500 }
    );
  }

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  return NextResponse.json({ content });
}
