import { NextResponse } from "next/server";
import { Portal, ensureSync } from "@/lib/db";
import { getUserNo } from "@/lib/session";
import { canEditPortal, canViewPortal, parseSharedWith } from "@/lib/access";

export async function GET(req: Request) {
  await ensureSync();
  const userNo = await getUserNo(req);
  if (!userNo) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 自分のボードに加えて、共有・公開されているボードも一覧に含める
  const portals = await Portal.findAll({
    where: { deleted: false },
    order: [["updatedAt", "DESC"]],
  });

  return NextResponse.json(
    portals
      .filter((portal) => canViewPortal(portal, userNo))
      .map((portal) => ({
        id: portal.id,
        name: portal.name,
        createdAt: portal.createdAt,
        updatedAt: portal.updatedAt,
        ownerNo: portal.userNo,
        isOwner: portal.userNo === userNo,
        visibility: portal.visibility,
        sharedWith: parseSharedWith(portal.sharedWith),
        editScope: portal.editScope,
        canEdit: canEditPortal(portal, userNo),
      }))
  );
}

export async function POST(req: Request) {
  await ensureSync();
  const userNo = await getUserNo(req);
  if (!userNo) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "ボード名を入力してください" },
      { status: 400 }
    );
  }

  const portal = await Portal.create({ name, userNo });
  return NextResponse.json({ id: portal.id }, { status: 201 });
}
