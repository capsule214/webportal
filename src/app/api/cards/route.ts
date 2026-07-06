import { NextResponse } from "next/server";
import { Card, Link, ensureSync } from "@/lib/db";
import type { CardData } from "@/components/DraggableCard";

export async function GET() {
  await ensureSync();
  const cards = await Card.findAll({
    include: [{ model: Link, as: "links" }],
    order: [
      ["z_index", "ASC"],
      [{ model: Link, as: "links" }, "sort_order", "ASC"],
    ],
  });

  return NextResponse.json(
    cards.map((card) => ({
      id: card.id,
      x: card.x,
      y: card.y,
      width: card.width,
      height: card.height,
      title: card.title,
      titleColor: card.titleColor,
      zIndex: card.zIndex,
      links: (card.links ?? []).map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
      })),
    }))
  );
}

export async function POST(req: Request) {
  await ensureSync();
  const body: CardData = await req.json();

  await Card.create({
    id: body.id,
    x: body.x,
    y: body.y,
    width: body.width,
    height: body.height,
    title: body.title,
    titleColor: body.titleColor,
    zIndex: body.zIndex,
  });

  await Link.bulkCreate(
    body.links.map((link, index) => ({
      id: link.id,
      cardId: body.id,
      title: link.title,
      url: link.url,
      sortOrder: index,
    }))
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
