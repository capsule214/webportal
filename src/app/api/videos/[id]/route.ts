import { NextResponse } from "next/server";
import { Video, ensureSync } from "@/lib/db";
import type { VideoData } from "@/components/DraggableVideo";

export async function PUT(
  req: Request,
  ctx: RouteContext<"/api/videos/[id]">
) {
  await ensureSync();
  const { id } = await ctx.params;
  const body: VideoData = await req.json();

  await Video.update(
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
  ctx: RouteContext<"/api/videos/[id]">
) {
  await ensureSync();
  const { id } = await ctx.params;

  await Video.destroy({ where: { id } });

  return NextResponse.json({ ok: true });
}
