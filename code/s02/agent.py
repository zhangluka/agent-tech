"""
Build An Agent - s02: 加入循环

上一章发一条消息就结束了。这次让模型能持续对话：
用户输入一句话，模型回复，用户再输入，模型再回复……
直到用户输入 exit 或 quit 退出。
"""

import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com",
)

# 对话历史——模型只看得到你喂给它的消息
messages = []

print("对话开始，输入 exit 退出。\n")

while True:
    # 拿到用户输入
    user_input = input("你: ")

    # 退出条件
    if user_input.strip().lower() in ("exit", "quit"):
        print("再见。")
        break

    # 把用户消息加入历史
    messages.append({"role": "user", "content": user_input})

    # 发给模型（带着完整历史）
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
    )

    # 取出模型回复
    assistant_reply = response.choices[0].message.content

    # 把模型回复也加入历史
    messages.append({"role": "assistant", "content": assistant_reply})

    # 打印
    print(f"AI: {assistant_reply}\n")
