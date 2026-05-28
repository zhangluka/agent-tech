import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const completion = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: "你是一个有帮助的助手。",
      },
      ...messages,
    ],
  });

  const reply = completion.choices[0].message.content ?? "";
  return NextResponse.json({ reply });
}
