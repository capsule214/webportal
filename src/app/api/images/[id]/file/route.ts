import { NextResponse } from "next/server";
import { Image, ensureSync } from "@/lib/db";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/images/[id]/file">
) {
  await ensureSync();
  const { id } = await ctx.params;

  const image = await Image.findByPk(id);
  if (!image || !image.data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(new Uint8Array(image.data), {
    status: 200,
    headers: {
      "Content-Type": image.mimeType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
