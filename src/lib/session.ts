// HMAC署名付きセッショントークン。proxy（Edge互換）とRoute Handlerの両方で
// 使えるようWeb Crypto APIのみを利用する。
const encoder = new TextEncoder();

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(userNo: string): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const value = encodeURIComponent(userNo);
  return `${value}.${await sign(value, secret)}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<string | null> {
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return null;
  const sep = token.lastIndexOf(".");
  if (sep <= 0) return null;
  const value = token.slice(0, sep);
  const sig = token.slice(sep + 1);
  const expected = await sign(value, secret);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (diff !== 0) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

// Route Handler用: リクエストのCookieヘッダーからユーザー番号を取り出す
export async function getUserNo(req: Request): Promise<string | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === "session") {
      return verifySessionToken(part.slice(eq + 1).trim());
    }
  }
  return null;
}
