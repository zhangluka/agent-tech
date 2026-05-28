import { NextRequest } from "next/server";

// 跟 s07 一模一样的流式接口，不做改动
export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "你是一个有用的助手。请用 Markdown 格式回复，代码块请标明语言。",
        },
        ...messages,
      ],
    }),
  });

  // 把 DeepSeek 的 SSE 流原样转发给前端
  return new Response(response.body, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
