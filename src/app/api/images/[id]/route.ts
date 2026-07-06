import { NextResponse } from "next/server";
import { Image, ensureSync } from "@/lib/db";
import type { ImageData } from "@/components/DraggableImage";

export async function PUT(
  req: Request,
  ctx: RouteContext<"/api/images/[id]">
) {
  await ensureSync();
  const { id } = await ctx.params;
  const body: ImageData = await req.json();

  await Image.update(
    {
      x: body.x,
      y: body.y,
      width: body.width,
      height: body.height,
      zIndex: body.zIndex,
      url: body.url,
    },
    { where: { id } }
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/images/[id]">
) {
  await ensureSync();
  const { id } = await ctx.params;

  await Image.destroy({ where: { id } });

  return NextResponse.json({ ok: true });
}
