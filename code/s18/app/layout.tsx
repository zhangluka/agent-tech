/**
 * Build An Agent - s18: 部署上线
 */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Build An Agent - s18 部署上线",
  description: "一个从零构建的 AI Agent 教程项目",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
