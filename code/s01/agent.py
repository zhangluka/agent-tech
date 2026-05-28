"""
Build An Agent - s01: 调通 API

最小脚本：发一条消息给 DeepSeek，打印回复。
"""

import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com",
)

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "user", "content": "用一句话解释什么是 Agent。"},
    ],
)

print(response.choices[0].message.content)
