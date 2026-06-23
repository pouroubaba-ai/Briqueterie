import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mois = searchParams.get("mois");
  const de   = searchParams.get("de");
  const a    = searchParams.get("a");
  const where: Record<string, unknown> = {};
  if (de && a) {
    where.date = { gte: new Date(de + "T00:00:00"), lte: new Date(a + "T23:59:59") };
  } else if (mois) {
    const d = new Date(mois);
    where.date = { gte: new Date(d.getFullYear(), d.getMonth(), 1), lt: new Date(d.getFullYear(), d.getMonth() + 1, 1) };
  }
  const depenses = await prisma.depense.findMany({
    where,
    orderBy: { date: "desc" },
  });
  return NextResponse.json(depenses);
}

export async function POST(req: Request) {
  try {
    const { montant, categorie, description, date } = await req.json();
    if (!montant || montant <= 0) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    if (!categorie?.trim()) return NextResponse.json({ error: "Catégorie requise" }, { status: 400 });

    const depense = await prisma.depense.create({
      data: {
        montant: Number(montant),
        categorie: categorie.trim(),
        description: description ?? "",
        date: date ? new Date(date) : new Date(),
      },
    });
    return NextResponse.json(depense, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
    await prisma.depense.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
