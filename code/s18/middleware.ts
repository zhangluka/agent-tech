/**
 * Build An Agent - s18: 部署上线
 *
 * Next.js Middleware：在请求到达 API route 之前执行。
 * 做两件事：CORS + Rate Limiting。
 *
 * Middleware 运行在 Edge Runtime，不能用 Node.js API。
 * 所以 rate limit 存储用 Map（内存），生产环境可换 Redis。
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Rate Limiting（内存版，单实例） ──────────────────────

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 20;
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  // 没有记录，或窗口已过期 → 重置
  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  // 在窗口内，检查次数
  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}

// 定期清理过期记录，防止内存泄漏
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore) {
    if (now > value.resetAt) rateLimitStore.delete(key);
  }
}, 60_000);

// ── CORS ────────────────────────────────────────────────

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = process.env.ALLOWED_ORIGINS || "*";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (allowed === "*") {
    headers["Access-Control-Allow-Origin"] = "*";
  } else if (origin && allowed.split(",").map((s) => s.trim()).includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  return headers;
}

// ── Middleware 主函数 ────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  // 只拦截 API 路由
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // OPTIONS 预检请求 → 直接返回 CORS 头
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  // Rate Limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const { allowed, remaining } = checkRateLimit(ip);

  if (!allowed) {
    return new NextResponse(
      JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(RATE_LIMIT_WINDOW / 1000)),
          ...getCorsHeaders(origin),
        },
      },
    );
  }

  // 放行，附加 CORS 头和 Rate Limit 信息头
  const response = NextResponse.next();
  const corsHeaders = getCorsHeaders(origin);
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX));

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
