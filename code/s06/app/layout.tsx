import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Build An Agent - Chat",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
