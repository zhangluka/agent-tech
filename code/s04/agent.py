"""
Build An Agent - s04: 工具路由

三个工具 + 一个注册表。新增工具不需要改循环。
"""

import os
import json
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com",
)


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
        for root, _, files in os.walk(path):
            for name in files:
                filepath = os.path.join(root, name)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        for i, line in enumerate(f, 1):
                            if query in line:
                                results.append(f"{filepath}:{i}: {line.rstrip()}")
                except (UnicodeDecodeError, PermissionError):
                    continue  # 跳过二进制文件和无权限文件
        if not results:
            return "没有找到匹配的内容。"
        return "\n".join(results[:50])  # 最多返回 50 条
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


# ── 对话循环 ───────────────────────────────────────────

messages = [
    {"role": "system", "content": "你是一个有文件访问能力的助手。可以用工具查看文件、列目录、搜索内容。"},
]

print("Agent 已启动，输入 quit 退出。\n")

while True:
    user_input = input("你：")
    if user_input.strip().lower() == "quit":
        break

    messages.append({"role": "user", "content": user_input})

    while True:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            tools=tools,
        )

        msg = response.choices[0].message
        messages.append(msg)

        # 模型没有调用工具，直接输出回复
        if msg.tool_calls is None:
            print(f"Agent：{msg.content}\n")
            break

        # 模型调用了工具，逐个执行
        for tool_call in msg.tool_calls:
            name = tool_call.function.name
            args = json.loads(tool_call.function.arguments)
            print(f"  [调用工具] {name}({args})")

            result = dispatch_tool(name, args)
            print(f"  [工具结果] {result[:200]}")

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            })
