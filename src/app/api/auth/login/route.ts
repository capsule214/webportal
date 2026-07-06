import { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/session";

// 認証ユーザーの一覧を環境変数から組み立てる。
// AUTH_USERS="user1:pass1,user2:pass2" 形式で複数ユーザーを定義でき、
// AUTH_USERNAME/AUTH_PASSWORD の単一ユーザーも従来どおり有効。
function getUsers(): Record<string, string> {
  const users: Record<string, string> = {};
  if (process.env.AUTH_USERS) {
    for (const pair of process.env.AUTH_USERS.split(",")) {
      const sep = pair.indexOf(":");
      if (sep > 0) {
        users[pair.slice(0, sep).trim()] = pair.slice(sep + 1).trim();
      }
    }
  }
  if (process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD) {
    users[process.env.AUTH_USERNAME] = process.env.AUTH_PASSWORD;
  }
  return users;
}

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  const users = getUsers();

  if (
    typeof username === "string" &&
    typeof password === "string" &&
    username in users &&
    users[username] === password
  ) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", await createSessionToken(username), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return res;
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
