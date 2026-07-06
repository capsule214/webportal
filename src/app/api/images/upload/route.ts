import { NextResponse } from "next/server";
import sharp from "sharp";
import { Image, ensureSync } from "@/lib/db";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_IMAGE_COUNT = 50;
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;

export async function POST(req: Request) {
  await ensureSync();

  const formData = await req.formData();
  const file = formData.get("file");
  const id = formData.get("id");

  if (!(file instanceof File) || typeof id !== "string" || !id) {
    return NextResponse.json(
      { error: "ファイルとIDを指定してください" },
      { status: 400 }
    );
  }

  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: "対応していない画像形式です" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "ファイルサイズは20MB以下にしてください" },
      { status: 413 }
    );
  }

  const count = await Image.count();
  if (count > MAX_IMAGE_COUNT) {
    return NextResponse.json(
      { error: "画像の登録上限に達しました" },
      { status: 422 }
    );
  }

  let data: Buffer = Buffer.from(await file.arrayBuffer());

  // GIFはアニメーションを保持するため無加工で保存する
  if (file.type !== "image/gif") {
    const metadata = await sharp(data).metadata();
    if (
      (metadata.width ?? 0) > MAX_WIDTH ||
      (metadata.height ?? 0) > MAX_HEIGHT
    ) {
      data = await sharp(data)
        .resize(MAX_WIDTH, MAX_HEIGHT, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .toBuffer();
    }
  }

  const url = `/api/images/${id}/file`;
  await Image.update(
    { mimeType: file.type, data, url },
    { where: { id } }
  );

  return NextResponse.json({ url });
}
