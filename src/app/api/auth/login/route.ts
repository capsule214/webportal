import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));

  if (
    username === process.env.AUTH_USERNAME &&
    password === process.env.AUTH_PASSWORD
  ) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", process.env.SESSION_SECRET!, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return res;
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
