import { NextResponse } from "next/server";
import { Card, Link, ensureSync, sequelize } from "@/lib/db";
import type { CardData } from "@/components/DraggableCard";

export async function PUT(req: Request, ctx: RouteContext<"/api/cards/[id]">) {
  await ensureSync();
  const { id } = await ctx.params;
  const body: CardData = await req.json();

  await sequelize.transaction(async (t) => {
    await Card.update(
      {
        x: body.x,
        y: body.y,
        width: body.width,
        height: body.height,
        title: body.title,
        titleColor: body.titleColor,
        zIndex: body.zIndex,
      },
      { where: { id }, transaction: t }
    );

    await Link.destroy({ where: { cardId: id }, transaction: t });
    await Link.bulkCreate(
      body.links.map((link, index) => ({
        id: link.id,
        cardId: id,
        title: link.title,
        url: link.url,
        sortOrder: index,
      })),
      { transaction: t }
    );
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/cards/[id]">
) {
  await ensureSync();
  const { id } = await ctx.params;

  await sequelize.transaction(async (t) => {
    await Link.destroy({ where: { cardId: id }, transaction: t });
    await Card.destroy({ where: { id }, transaction: t });
  });

  return NextResponse.json({ ok: true });
}
