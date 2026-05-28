"use client";

import { useState, useCallback } from "react";
import type { Node } from "@xyflow/react";
import Canvas from "./components/Canvas";
import SidePanel from "./components/SidePanel";

export default function Home() {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const handleSelectNode = useCallback((node: Node | null) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* 画布区域 */}
      <div className="flex-1 relative">
        {/* 顶部标题栏 */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-zinc-950/80 backdrop-blur-sm
                        border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold text-sm">可视化画布</span>
            <span className="text-zinc-500 text-xs">拖拽节点 · 连接连线 · 构建工作流</span>
          </div>
        </div>

        <Canvas onSelectNode={handleSelectNode} />
      </div>

      {/* 侧面板 */}
      {selectedNode && (
        <SidePanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
}
