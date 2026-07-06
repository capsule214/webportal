import { NextResponse } from "next/server";
import { Video, ensureSync } from "@/lib/db";
import type { VideoData } from "@/components/DraggableVideo";

export async function GET() {
  await ensureSync();
  const videos = await Video.findAll({
    order: [["z_index", "ASC"]],
  });

  return NextResponse.json(
    videos.map((video) => ({
      id: video.id,
      x: video.x,
      y: video.y,
      width: video.width,
      height: video.height,
      zIndex: video.zIndex,
      url: video.url,
    }))
  );
}

export async function POST(req: Request) {
  await ensureSync();
  const body: VideoData = await req.json();

  await Video.create({
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
