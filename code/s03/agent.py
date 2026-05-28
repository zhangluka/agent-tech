import os
import json
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com",
)

# ============================================================
# 工具：读取文件
# ============================================================

def read_file(path: str) -> str:
    """读取指定路径的文件，返回内容。"""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return f"错误：文件 '{path}' 不存在。"
    except Exception as e:
        return f"错误：读取文件时出错 — {e}"

# 告诉模型它有哪些工具可用
tools = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "读取指定路径的文件内容。当你需要查看某个文件时使用这个工具。",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "要读取的文件路径",
                    }
                },
                "required": ["path"],
            },
        },
    }
]

# 工具名 → 实际函数的映射
available_functions = {
    "read_file": read_file,
}

# ============================================================
# 对话循环
# ============================================================

messages = [
    {"role": "system", "content": "你是一个有用的助手。当用户问到文件相关的问题时，使用工具来读取文件内容。"},
]

print("对话开始，输入 exit 退出。\n")

while True:
    user_input = input("你: ")
    if user_input.strip().lower() in ("exit", "quit"):
        break

    messages.append({"role": "user", "content": user_input})

    # 第一步：发消息给模型（带上工具定义）
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
        tools=tools,
    )

    assistant_message = response.choices[0].message

    # 判断模型是想说话，还是想调用工具
    if assistant_message.tool_calls:
        # 模型想调用工具 —— 先把它说的话存进历史
        messages.append(assistant_message)

        # 逐个执行模型请求的工具调用
        for tool_call in assistant_message.tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)

            print(f"  [调用工具] {function_name}({function_args})")

            # 执行函数
            result = available_functions[function_name](**function_args)

            # 把结果喂回给模型
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            })

        # 第二步：模型拿到工具结果，生成最终回复
        second_response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            tools=tools,
        )
        final_reply = second_response.choices[0].message.content
        messages.append({"role": "assistant", "content": final_reply})
        print(f"\n助手: {final_reply}\n")

    else:
        # 模型只想说话，没有调用工具
        reply = assistant_message.content
        messages.append({"role": "assistant", "content": reply})
        print(f"\n助手: {reply}\n")
