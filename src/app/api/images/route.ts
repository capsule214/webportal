import { NextResponse } from "next/server";
import { Image, ensureSync } from "@/lib/db";
import type { ImageData } from "@/components/DraggableImage";

export async function GET() {
  await ensureSync();
  const images = await Image.findAll({
    attributes: ["id", "x", "y", "width", "height", "zIndex", "url"],
    order: [["z_index", "ASC"]],
  });

  return NextResponse.json(
    images.map((image) => ({
      id: image.id,
      x: image.x,
      y: image.y,
      width: image.width,
      height: image.height,
      zIndex: image.zIndex,
      url: image.url,
    }))
  );
}

export async function POST(req: Request) {
  await ensureSync();
  const body: ImageData = await req.json();

  await Image.create({
    id: body.id,
    x: body.x,
    y: body.y,
    width: body.width,
    height: body.height,
    zIndex: body.zIndex,
    url: body.url,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
