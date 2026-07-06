import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session";

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  const userNo = await verifySessionToken(token);

  if (userNo) {
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

  // 画面はログイン画面へリダイレクト
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/memo/:path*", "/portals/:path*", "/api/:path*"],
};
