import { NextResponse } from "next/server";
import {
  Portal,
  Content,
  ContentDetail,
  ensureSync,
  sequelize,
} from "@/lib/db";
import { getUserNo } from "@/lib/session";

// 所有ユーザーのコンテンツだけを取得する
async function findOwnedContent(req: Request, id: string) {
  const userNo = await getUserNo(req);
  if (!userNo) return null;
  return Content.findOne({
    where: { id, deleted: false },
    include: [
      { model: Portal, where: { userNo, deleted: false }, required: true },
    ],
  });
}

export async function PUT(
  req: Request,
  ctx: RouteContext<"/api/contents/[id]">
) {
  await ensureSync();
  const { id } = await ctx.params;
  const content = await findOwnedContent(req, id);
  if (!content) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  await sequelize.transaction(async (t) => {
    await content.update(
      {
        contentName:
          typeof body.contentName === "string"
            ? body.contentName
            : content.contentName,
        x: Number.isFinite(Number(body.x)) ? Number(body.x) : content.x,
        y: Number.isFinite(Number(body.y)) ? Number(body.y) : content.y,
        w: Number.isFinite(Number(body.w)) ? Number(body.w) : content.w,
        h: Number.isFinite(Number(body.h)) ? Number(body.h) : content.h,
      },
      { transaction: t }
    );

    // details を送ってきた場合のみ詳細行を作り直す
    if (Array.isArray(body.details)) {
      await ContentDetail.destroy({
        where: { contentsId: content.id },
        transaction: t,
      });
      if (body.details.length > 0) {
        await ContentDetail.bulkCreate(
          body.details.map((contents: unknown) => ({
            contentsId: content.id,
            contents: String(contents),
          })),
          { transaction: t }
        );
      }
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  ctx: RouteContext<"/api/contents/[id]">
) {
  await ensureSync();
  const { id } = await ctx.params;
  const content = await findOwnedContent(req, id);
  if (!content) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 論理削除
  await content.update({ deleted: true });
  return NextResponse.json({ ok: true });
}
