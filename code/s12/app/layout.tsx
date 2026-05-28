import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Builder - s12",
  description: "自定义节点 - 可配置的工作流节点",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-zinc-950 text-white">{children}</body>
    </html>
  );
}
