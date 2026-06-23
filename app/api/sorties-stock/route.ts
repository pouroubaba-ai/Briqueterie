export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mois = searchParams.get("mois");
  const where: Record<string, unknown> = {};
  if (mois) {
    const d = new Date(mois);
    where.date = {
      gte: new Date(d.getFullYear(), d.getMonth(), 1),
      lt: new Date(d.getFullYear(), d.getMonth() + 1, 1),
    };
  }
  const sorties = await prisma.sortieStock.findMany({
    where,
    include: { brique: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(sorties);
}

export async function POST(req: Request) {
  try {
    const { briqueId, quantite, type, notes, date } = await req.json();

    if (!briqueId || !quantite || quantite <= 0) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const sortie = await prisma.sortieStock.create({
      data: {
        briqueId: Number(briqueId),
        quantite: Number(quantite),
        type: type ?? "autre",
        notes: notes ?? "",
        date: date ? new Date(date) : new Date(),
      },
      include: { brique: true },
    });

    await prisma.brique.update({
      where: { id: Number(briqueId) },
      data: { stockActuel: { decrement: Number(quantite) } },
    });

    return NextResponse.json(sortie, { status: 201 });
  } catch (err) {
    console.error("POST /api/sorties-stock error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
