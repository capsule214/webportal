import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/uploads/[name]">
) {
  const { name } = await ctx.params;

  // パストラバーサル防止: 英数・ハイフン・アンダースコア・ドットのみ許可
  if (!/^[\w.-]+$/.test(name) || name.includes("..")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const data = await readFile(path.join(process.cwd(), "uploads", name));
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
