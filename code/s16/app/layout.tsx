/**
 * Build An Agent - s16: 权限与确认
 */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Build An Agent - s16 权限与确认",
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
