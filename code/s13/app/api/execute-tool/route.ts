/**
 * Build An Agent - s13: 连线与执行
 *
 * 工具执行 API：接收工具名和参数，执行并返回结果。
 * 内置工具：echo、read_file、list_files、search。
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir } from "fs/promises";
import { resolve, relative } from "path";

const PROJECT_ROOT = resolve(process.cwd(), "..");

/** 安全路径检查 */
function safePath(path: string): string {
  const abs = resolve(PROJECT_ROOT, path);
  if (!abs.startsWith(PROJECT_ROOT)) {
    throw new Error("不能访问项目目录之外的文件");
  }
  return abs;
}

/** 工具分发 */
async function dispatchTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "echo":
      return typeof args.input === "string" ? args.input : JSON.stringify(args);

    case "read_file": {
      const path = args.path as string;
      if (!path) return "错误：缺少 path 参数";
      const content = await readFile(safePath(path), "utf-8");
      return content.length > 2000 ? content.slice(0, 2000) + "\n...(已截断)" : content;
    }

    case "list_files": {
      const dir = (args.dir as string) || ".";
      const entries = await readdir(safePath(dir), { withFileTypes: true });
      return entries
        .map((e) => `${e.isDirectory() ? "[dir]" : "[file]"} ${e.name}`)
        .join("\n");
    }

    case "search": {
      const keyword = args.keyword as string;
      const dir = (args.dir as string) || ".";
      if (!keyword) return "错误：缺少 keyword 参数";

      const entries = await readdir(safePath(dir), { withFileTypes: true });
      return entries
        .filter((e) => e.name.includes(keyword))
        .map((e) => e.name)
        .join("\n") || "未找到匹配项";
    }

    default:
      return `未知工具: ${name}`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { toolName, args } = await req.json();
    const result = await dispatchTool(toolName, args || {});
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
