import { NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import sharp from "sharp";
import {
  Portal,
  Content,
  ContentDetail,
  CONTENT_TYPE,
  ensureSync,
} from "@/lib/db";
import { getUserNo } from "@/lib/session";
import { canEditPortal } from "@/lib/access";

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

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/contents/[id]/upload">
) {
  await ensureSync();
  const { id } = await ctx.params;
  const userNo = await getUserNo(req);
  if (!userNo) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const content = await Content.findOne({
    where: { id, deleted: false, typeId: CONTENT_TYPE.IMAGE },
  });
  if (!content) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const portal = await Portal.findOne({
    where: { id: content.portalId, deleted: false },
  });
  if (!portal || !canEditPortal(portal, userNo)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "ファイルを指定してください" },
      { status: 400 }
    );
  }

  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (
    !ALLOWED_MIME_TYPES.includes(file.type) ||
    !ALLOWED_EXTENSIONS.includes(ext)
  ) {
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

  const count = await Content.count({
    where: { typeId: CONTENT_TYPE.IMAGE, deleted: false },
  });
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

  const fileName = `${content.id}_${Date.now()}${ext}`;
  const uploadDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), data);

  // 詳細行をファイル名で置き換える
  await ContentDetail.destroy({ where: { contentsId: content.id } });
  await ContentDetail.create({ contentsId: content.id, contents: fileName });

  return NextResponse.json({ url: `/api/uploads/${fileName}` });
}
