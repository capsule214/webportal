import { NextResponse } from "next/server";
import {
  Portal,
  Content,
  ContentDetail,
  CONTENT_TYPE,
  ensureSync,
} from "@/lib/db";
import { getUserNo } from "@/lib/session";
import { canEditPortal, canViewPortal } from "@/lib/access";

// URLリンクカードの詳細行（meta行 + link行のJSON文字列）をパースする
function parseCardDetails(details: ContentDetail[]) {
  let titleColor = "";
  const links: { id: string; title: string; url: string }[] = [];
  for (const detail of details) {
    try {
      const obj = JSON.parse(detail.contents);
      if (obj?.kind === "meta") {
        titleColor = typeof obj.titleColor === "string" ? obj.titleColor : "";
      } else if (obj?.kind === "link") {
        links.push({
          id: String(detail.id),
          title: typeof obj.title === "string" ? obj.title : "",
          url: typeof obj.url === "string" ? obj.url : "",
        });
      }
    } catch {
      // JSONでない行は無視する
    }
  }
  return { titleColor, links };
}

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/portals/[id]/contents">
) {
  await ensureSync();
  const { id } = await ctx.params;
  const userNo = await getUserNo(req);
  if (!userNo) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const portal = await Portal.findOne({ where: { id, deleted: false } });
  if (!portal || !canViewPortal(portal, userNo)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await Content.findAll({
    where: { portalId: portal.id, deleted: false },
    include: [{ model: ContentDetail, as: "details" }],
    order: [
      ["id", "ASC"],
      [{ model: ContentDetail, as: "details" }, "id", "ASC"],
    ],
  });

  const cards = [];
  const images = [];
  const videos = [];
  const richTexts = [];
  let z = 0;

  for (const row of rows) {
    z += 1;
    const base = {
      id: row.id,
      x: row.x,
      y: row.y,
      width: row.w,
      height: row.h,
      zIndex: z,
    };
    const details = row.details ?? [];
    switch (row.typeId) {
      case CONTENT_TYPE.LINK_CARD: {
        const { titleColor, links } = parseCardDetails(details);
        cards.push({
          ...base,
          title: row.contentName,
          titleColor: titleColor || "#3b82f6",
          links,
        });
        break;
      }
      case CONTENT_TYPE.IMAGE:
        images.push({
          ...base,
          url: details[0]?.contents
            ? `/api/uploads/${details[0].contents}`
            : "",
        });
        break;
      case CONTENT_TYPE.VIDEO:
        videos.push({ ...base, url: details[0]?.contents ?? "" });
        break;
      case CONTENT_TYPE.RICH_TEXT:
        richTexts.push({ ...base, content: details[0]?.contents ?? "" });
        break;
    }
  }

  return NextResponse.json({
    portal: { id: portal.id, name: portal.name },
    canEdit: canEditPortal(portal, userNo),
    cards,
    images,
    videos,
    richTexts,
  });
}

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/portals/[id]/contents">
) {
  await ensureSync();
  const { id } = await ctx.params;
  const userNo = await getUserNo(req);
  if (!userNo) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const portal = await Portal.findOne({ where: { id, deleted: false } });
  if (!portal || !canViewPortal(portal, userNo)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canEditPortal(portal, userNo)) {
    return NextResponse.json({ error: "編集権限がありません" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const typeId = Number(body.typeId);
  if (![1, 2, 3, 4].includes(typeId)) {
    return NextResponse.json({ error: "不正な種別です" }, { status: 400 });
  }

  const content = await Content.create({
    portalId: portal.id,
    contentName: typeof body.contentName === "string" ? body.contentName : "",
    typeId,
    x: Number(body.x) || 0,
    y: Number(body.y) || 0,
    w: Number(body.w) || 200,
    h: Number(body.h) || 140,
  });

  const details: string[] = Array.isArray(body.details) ? body.details : [];
  if (details.length > 0) {
    await ContentDetail.bulkCreate(
      details.map((contents) => ({
        contentsId: content.id,
        contents: String(contents),
      }))
    );
  }

  return NextResponse.json({ id: content.id }, { status: 201 });
}
