import { NextResponse } from "next/server";
import { Portal, ensureSync } from "@/lib/db";
import { getUserNo } from "@/lib/session";

async function findOwnedPortal(req: Request, id: string) {
  const userNo = await getUserNo(req);
  if (!userNo) return null;
  return Portal.findOne({ where: { id, userNo, deleted: false } });
}

export async function PUT(req: Request, ctx: RouteContext<"/api/portals/[id]">) {
  await ensureSync();
  const { id } = await ctx.params;
  const portal = await findOwnedPortal(req, id);
  if (!portal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "ボード名を入力してください" },
      { status: 400 }
    );
  }

  await portal.update({ name });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  ctx: RouteContext<"/api/portals/[id]">
) {
  await ensureSync();
  const { id } = await ctx.params;
  const portal = await findOwnedPortal(req, id);
  if (!portal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 論理削除
  await portal.update({ deleted: true });
  return NextResponse.json({ ok: true });
}
