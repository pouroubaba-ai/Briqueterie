export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const mois = searchParams.get("mois");
  const de = searchParams.get("de");
  const a = searchParams.get("a");
  const where: Record<string, unknown> = { userId };
  if (de && a) {
    where.date = { gte: new Date(de + "T00:00:00"), lte: new Date(a + "T23:59:59") };
  } else if (mois) {
    const d = new Date(mois);
    where.date = { gte: new Date(d.getFullYear(), d.getMonth(), 1), lt: new Date(d.getFullYear(), d.getMonth() + 1, 1) };
  }
  const depenses = await prisma.depense.findMany({ where, orderBy: { date: "desc" } });
  return NextResponse.json(depenses);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const { montant, categorie, description, date } = await req.json();
    if (!montant || montant <= 0) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    if (!categorie?.trim()) return NextResponse.json({ error: "Catégorie requise" }, { status: 400 });
    const depense = await prisma.depense.create({
      data: { userId, montant: Number(montant), categorie: categorie.trim(), description: description ?? "", date: date ? new Date(date) : new Date() },
    });
    return NextResponse.json(depense, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
    await prisma.depense.deleteMany({ where: { id: Number(id), userId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
