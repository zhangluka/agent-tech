import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Build An Agent - s07",
  description: "流式输出 - Streaming Output",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
