/**
 * Build An Agent - s15: 执行日志
 *
 * 工作流导入/导出工具。
 * （与 s14 相同，此处保持不变）
 */

import type { Workflow } from "../engine/types";

/**
 * 将工作流导出为 JSON 字符串。
 */
export function exportWorkflow(workflow: Workflow): string {
  return JSON.stringify(workflow, null, 2);
}

/**
 * 从 JSON 字符串导入工作流。
 * 做基本的结构校验。
 */
export function importWorkflow(json: string): Workflow {
  const data = JSON.parse(json);

  if (!data.id || !data.name || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw new Error("无效的工作流格式：缺少 id、name、nodes 或 edges");
  }

  for (const node of data.nodes) {
    if (!node.id || !node.type || !node.position) {
      throw new Error(`节点格式错误: ${JSON.stringify(node)}`);
    }
  }

  for (const edge of data.edges) {
    if (!edge.id || !edge.source || !edge.target) {
      throw new Error(`边格式错误: ${JSON.stringify(edge)}`);
    }
  }

  return data as Workflow;
}

/**
 * 下载工作流为 JSON 文件。
 */
export function downloadWorkflow(workflow: Workflow): void {
  const json = exportWorkflow(workflow);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${workflow.name || "workflow"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 从文件上传读取工作流。
 */
export function uploadWorkflow(): Promise<Workflow> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error("未选择文件"));
      try {
        const text = await file.text();
        resolve(importWorkflow(text));
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}

/**
 * 导出执行日志为 JSON 文件。
 */
export function exportExecutionLog(run: import("../engine/types").ExecutionRun): void {
  const json = JSON.stringify(run, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `execution_${run.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
