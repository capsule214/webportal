import { NextResponse } from "next/server";
import { RichText, ensureSync } from "@/lib/db";
import type { RichTextData } from "@/components/DraggableRichText";

export async function GET() {
  await ensureSync();
  const richTexts = await RichText.findAll({
    order: [["z_index", "ASC"]],
  });

  return NextResponse.json(
    richTexts.map((note) => ({
      id: note.id,
      x: note.x,
      y: note.y,
      width: note.width,
      height: note.height,
      zIndex: note.zIndex,
      content: note.content,
    }))
  );
}

export async function POST(req: Request) {
  await ensureSync();
  const body: RichTextData = await req.json();

  await RichText.create({
    id: body.id,
    x: body.x,
    y: body.y,
    width: body.width,
    height: body.height,
    zIndex: body.zIndex,
    content: body.content,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
