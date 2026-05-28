import Canvas from "./components/Canvas";

export default function Home() {
  return (
    <main className="h-screen flex flex-col">
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg">Agent Builder</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
            s12 - 自定义节点
          </span>
        </div>
        <div className="text-xs text-zinc-500">
          点击节点配置参数 · 拖拽连线定义流程
        </div>
      </header>
      <div className="flex-1">
        <Canvas />
      </div>
    </main>
  );
}
