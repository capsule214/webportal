import { NextResponse } from "next/server";
import { RichText, ensureSync } from "@/lib/db";
import type { RichTextData } from "@/components/DraggableRichText";

export async function PUT(
  req: Request,
  ctx: RouteContext<"/api/rich-texts/[id]">
) {
  await ensureSync();
  const { id } = await ctx.params;
  const body: RichTextData = await req.json();

  await RichText.update(
    {
      x: body.x,
      y: body.y,
      width: body.width,
      height: body.height,
      zIndex: body.zIndex,
      content: body.content,
    },
    { where: { id } }
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/rich-texts/[id]">
) {
  await ensureSync();
  const { id } = await ctx.params;

  await RichText.destroy({ where: { id } });

  return NextResponse.json({ ok: true });
}
