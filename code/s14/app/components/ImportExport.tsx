"use client";

import { useRef, useState } from "react";
import type { Node, Edge } from "reactflow";
import {
  serialize,
  downloadJSON,
  readUploadedFile,
  validate,
  deserialize,
  saveToLibrary,
  type WorkflowJSON,
} from "../utils/workflowIO";

interface ImportExportProps {
  nodes: Node[];
  edges: Edge[];
  onLoad: (nodes: Node[], edges: Edge[]) => void;
  workflowName?: string;
}

/**
 * 导入导出组件
 *
 * 导出：把当前画布打包成 .json 下载
 * 导入：上传 .json 文件，解析后恢复画布
 */
export default function ImportExport({
  nodes,
  edges,
  onLoad,
  workflowName,
}: ImportExportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 导出
  const handleExport = () => {
    const name = workflowName || "未命名工作流";
    const workflow = serialize(name, "", nodes, edges);
    downloadJSON(workflow);
    showSuccess(`已导出 ${name}.json`);
  };

  // 导入
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    try {
      const json = await readUploadedFile(file);
      const result = validate(json);

      if (!result.valid) {
        setError(result.error || "校验失败");
        return;
      }

      const { nodes: n, edges: e } = deserialize(json);
      onLoad(n, e);
      showSuccess(`已导入 "${json.meta.name}"`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    }

    // 重置 input，允许重复导入同一文件
    if (fileRef.current) fileRef.current.value = "";
  };

  // 保存到本地库
  const handleSaveToLibrary = () => {
    const name = workflowName || "未命名工作流";
    const workflow = serialize(name, "", nodes, edges);
    saveToLibrary(workflow);
    showSuccess(`已保存到本地库`);
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* 导出按钮 */}
        <button
          onClick={handleExport}
          className="px-3 py-1.5 text-sm rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
        >
          导出 JSON
        </button>

        {/* 导入按钮 */}
        <button
          onClick={() => fileRef.current?.click()}
          className="px-3 py-1.5 text-sm rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
        >
          导入 JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />

        {/* 保存到本地库 */}
        <button
          onClick={handleSaveToLibrary}
          className="px-3 py-1.5 text-sm rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
        >
          存到本地库
        </button>
      </div>

      {/* 状态提示 */}
      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}
      {success && (
        <p className="text-emerald-400 text-xs">{success}</p>
      )}
    </div>
  );
}
