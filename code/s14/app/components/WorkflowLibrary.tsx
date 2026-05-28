"use client";

import { useState, useEffect } from "react";
import type { Node, Edge } from "reactflow";
import {
  loadLibrary,
  deleteFromLibrary,
  deserialize,
  type WorkflowJSON,
} from "../utils/workflowIO";

interface WorkflowLibraryProps {
  onLoad: (nodes: Node[], edges: Edge[], meta: WorkflowJSON["meta"]) => void;
}

/**
 * 工作流本地库
 *
 * 从 localStorage 加载已保存的工作流列表。
 * 支持加载、删除操作。
 */
export default function WorkflowLibrary({ onLoad }: WorkflowLibraryProps) {
  const [library, setLibrary] = useState<WorkflowJSON[]>([]);
  const [expanded, setExpanded] = useState(false);

  // 组件挂载时加载库
  useEffect(() => {
    setLibrary(loadLibrary());
  }, []);

  // 刷新列表
  const refresh = () => {
    setLibrary(loadLibrary());
  };

  const handleLoad = (workflow: WorkflowJSON) => {
    const { nodes, edges } = deserialize(workflow);
    onLoad(nodes, edges, workflow.meta);
  };

  const handleDelete = (id: string) => {
    deleteFromLibrary(id);
    refresh();
  };

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden">
      {/* 标题栏 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-zinc-300 text-sm font-medium">本地工作流库</span>
          <span className="text-zinc-600 text-xs">({library.length})</span>
        </div>
        <span className="text-zinc-500 text-xs">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {/* 列表 */}
      {expanded && (
        <div className="bg-zinc-900 max-h-[300px] overflow-y-auto">
          {library.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-6">
              还没有保存的工作流
            </p>
          ) : (
            library.map((wf) => (
              <div
                key={wf.meta.id}
                className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 hover:bg-zinc-800 group"
              >
                <div className="min-w-0">
                  <p className="text-zinc-200 text-sm truncate">
                    {wf.meta.name}
                  </p>
                  <p className="text-zinc-600 text-xs">
                    {wf.nodes.length} 节点 · {wf.edges.length} 边 ·
                    v{wf.meta.version}
                  </p>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleLoad(wf)}
                    className="px-2 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    加载
                  </button>
                  <button
                    onClick={() => handleDelete(wf.meta.id)}
                    className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-500 text-white"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))
          )}

          {/* 刷新按钮 */}
          <button
            onClick={refresh}
            className="w-full px-4 py-2 text-zinc-500 text-xs hover:text-zinc-300 hover:bg-zinc-800"
          >
            刷新列表
          </button>
        </div>
      )}
    </div>
  );
}
