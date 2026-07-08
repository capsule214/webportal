import { NextResponse } from "next/server";
import { Portal, ensureSync } from "@/lib/db";
import { getUserNo } from "@/lib/session";
import {
  EDIT_SCOPES,
  VISIBILITIES,
  type EditScope,
  type Visibility,
} from "@/lib/access";

// 設定変更・削除は所有者のみ
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

  const updates: Record<string, string> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "ボード名を入力してください" },
        { status: 400 }
      );
    }
    updates.name = name;
  }

  if (body.visibility !== undefined) {
    if (!VISIBILITIES.includes(body.visibility as Visibility)) {
      return NextResponse.json(
        { error: "公開範囲の値が不正です" },
        { status: 400 }
      );
    }
    updates.visibility = body.visibility;
  }

  if (body.sharedWith !== undefined) {
    if (!Array.isArray(body.sharedWith)) {
      return NextResponse.json(
        { error: "公開先ユーザーの値が不正です" },
        { status: 400 }
      );
    }
    updates.sharedWith = body.sharedWith
      .map((u: unknown) => String(u).replace(/,/g, "").trim())
      .filter(Boolean)
      .join(",");
  }

  if (body.editScope !== undefined) {
    if (!EDIT_SCOPES.includes(body.editScope as EditScope)) {
      return NextResponse.json(
        { error: "編集権の値が不正です" },
        { status: 400 }
      );
    }
    updates.editScope = body.editScope;
  }

  await portal.update(updates);
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
