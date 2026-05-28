"""
Build An Agent - s05: 结果回流

工具执行结果送回模型，模型据此决定下一步。
多轮工具调用形成推理链——Agent 诞生。
"""

import os
import json
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com",
)

MODEL = "deepseek-chat"

# 单次用户请求最多执行多少轮工具调用，防止死循环
MAX_ROUNDS = 10


# ── 工具实现 ──────────────────────────────────────────

def read_file(path: str) -> str:
    """读取文件内容。"""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"错误：{e}"


def list_files(path: str = ".") -> str:
    """列出目录下的文件和子目录。"""
    try:
        entries = os.listdir(path)
        return "\n".join(sorted(entries))
    except Exception as e:
        return f"错误：{e}"


def search_files(query: str, path: str = ".") -> str:
    """在目录下的文本文件中搜索包含关键词的行。"""
    results = []
    try:
        for root, dirs, files in os.walk(path):
            # 跳过隐藏目录和常见的无关目录
            dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("node_modules", "__pycache__", "venv")]
            for name in files:
                filepath = os.path.join(root, name)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        for i, line in enumerate(f, 1):
                            if query in line:
                                results.append(f"{filepath}:{i}: {line.rstrip()}")
                except (UnicodeDecodeError, PermissionError):
                    continue
        if not results:
            return "没有找到匹配的内容。"
        return "\n".join(results[:50])
    except Exception as e:
        return f"错误：{e}"


# ── 工具注册表 ─────────────────────────────────────────

TOOL_REGISTRY = {
    "read_file": read_file,
    "list_files": list_files,
    "search_files": search_files,
}


def dispatch_tool(name: str, args: dict) -> str:
    """从注册表中查找工具并执行。"""
    func = TOOL_REGISTRY.get(name)
    if func is None:
        return f"错误：未知工具 {name}"
    return func(**args)


# ── 工具定义（给模型看的说明书） ────────────────────────

tools = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "读取指定路径的文件内容",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "文件路径"},
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": "列出指定目录下的文件和子目录",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "目录路径，默认为当前目录"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_files",
            "description": "在目录下的文件中搜索包含指定关键词的行",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "要搜索的关键词"},
                    "path": {"type": "string", "description": "搜索的目录路径，默认为当前目录"},
                },
                "required": ["query"],
            },
        },
    },
]


# ── Agent 核心循环 ──────────────────────────────────────

def run(user_message: str):
    """
    运行 Agent。

    核心逻辑：
    1. 把用户消息发给模型
    2. 如果模型返回 tool_calls，执行工具，把结果送回模型
    3. 重复步骤 2，直到模型不再调用工具（直接回复文本）
    4. 最多循环 MAX_ROUNDS 轮，防止死循环
    """

    messages = [
        {"role": "system", "content": "你是一个有文件访问能力的助手。可以用工具查看文件、列目录、搜索内容。"},
        {"role": "user", "content": user_message},
    ]

    for round_num in range(1, MAX_ROUNDS + 1):
        print(f"\n{'='*40} 第 {round_num} 轮 {'='*40}")

        # 调用模型
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=tools,
        )

        msg = response.choices[0].message

        # 情况 1：模型没有调用工具，直接回复文本 → 结束
        if not msg.tool_calls:
            print(f"\n[最终回复]\n{msg.content}")
            messages.append({"role": "assistant", "content": msg.content})
            break

        # 情况 2：模型调用了工具 → 执行工具，结果送回模型
        # 先把模型的回复（包含 tool_calls）加入消息历史
        messages.append(msg)

        for tc in msg.tool_calls:
            func_name = tc.function.name
            func_args = json.loads(tc.function.arguments)
            print(f"  [调用工具] {func_name}({func_args})")

            result = dispatch_tool(func_name, func_args)
            print(f"  [工具结果] {result[:200]}{'...' if len(result) > 200 else ''}")

            # 把工具执行结果加入消息历史
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result,
            })
    else:
        # for 循环正常结束（没触发 break）= 达到最大轮次
        print(f"\n[警告] 达到最大轮次 {MAX_ROUNDS}，停止执行。")

    return messages


# ── 入口 ──────────────────────────────────────────────

if __name__ == "__main__":
    print("Agent 已启动。")
    print("示例问题：帮我看看这个项目用了什么技术栈\n")

    while True:
        user_input = input("你：")
        if user_input.strip().lower() == "quit":
            break
        run(user_input)
