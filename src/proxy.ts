import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  const session = request.cookies.get("session");
  const authenticated =
    !!session && !!process.env.SESSION_SECRET && session.value === process.env.SESSION_SECRET;

  if (authenticated) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // 認証系APIは未認証でも許可する
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // /memo 配下はログイン画面へリダイレクト
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/memo/:path*", "/api/:path*"],
};
