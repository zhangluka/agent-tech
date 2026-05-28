import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Build An Agent - s08 内容渲染",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-950 text-gray-100 antialiased">{children}</body>
    </html>
  );
}
