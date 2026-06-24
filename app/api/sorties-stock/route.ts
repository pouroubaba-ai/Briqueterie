export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const mois = searchParams.get("mois");
  const where: Record<string, unknown> = { userId };
  if (mois) {
    const d = new Date(mois);
    where.date = { gte: new Date(d.getFullYear(), d.getMonth(), 1), lt: new Date(d.getFullYear(), d.getMonth() + 1, 1) };
  }
  const sorties = await prisma.sortieStock.findMany({ where, include: { brique: true }, orderBy: { date: "desc" } });
  return NextResponse.json(sorties);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const { briqueId, quantite, type, notes, date } = await req.json();
    if (!briqueId || !quantite || quantite <= 0) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    const brique = await prisma.brique.findUnique({ where: { id: Number(briqueId) } });
    if (!brique) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    if (brique.stockActuel <= 0) return NextResponse.json({ error: "Stock déjà à zéro, sortie impossible." }, { status: 400 });
    if (Number(quantite) > brique.stockActuel) return NextResponse.json({ error: `Quantité insuffisante. Stock disponible : ${brique.stockActuel}` }, { status: 400 });
    const sortie = await prisma.sortieStock.create({
      data: { userId, briqueId: Number(briqueId), quantite: Number(quantite), type: type ?? "autre", notes: notes ?? "", date: date ? new Date(date) : new Date() },
      include: { brique: true },
    });
    await prisma.brique.update({ where: { id: Number(briqueId) }, data: { stockActuel: { decrement: Number(quantite) } } });
    return NextResponse.json(sortie, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur serveur" }, { status: 500 });
  }
}
