export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const de = searchParams.get("de");
  const a = searchParams.get("a");
  const where: Record<string, unknown> = { userId };
  if (de && a) {
    where.date = { gte: new Date(de + "T00:00:00.000Z"), lte: new Date(a + "T23:59:59.999Z") };
  }
  const productions = await prisma.productionJour.findMany({
    where,
    include: { briques: { include: { brique: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(productions);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const { date, briques, montantVerse, notes, consommations = [] } = await req.json();
    if (!briques || !Array.isArray(briques) || briques.length === 0) {
      return NextResponse.json({ error: "Aucune ligne de production" }, { status: 400 });
    }
    type LigneIn = { briqueId: number; nombreSacs: number; prixParSac: number; quantiteAjoutee: number; soustraireCiment?: boolean };
    const totalSacs = briques.reduce((s: number, b: LigneIn) => s + b.nombreSacs, 0);
    const montantDu = briques.reduce((s: number, b: LigneIn) => s + b.nombreSacs * (b.prixParSac ?? 0), 0);
    const dateObj = new Date(date);
    const verseImmédiat = Math.min(montantVerse ?? 0, montantDu);

    const production = await prisma.productionJour.create({
      data: {
        userId, date: dateObj, totalSacs, montantDu,
        montantVerse: verseImmédiat,
        statut: verseImmédiat >= montantDu ? "solde" : verseImmédiat > 0 ? "partiel" : "impaye",
        notes: notes ?? "",
        briques: {
          create: (briques as LigneIn[]).map(b => ({
            briqueId: b.briqueId, nombreSacs: b.nombreSacs,
            prixParSac: b.prixParSac ?? 0, quantiteAjoutee: b.quantiteAjoutee ?? b.nombreSacs,
          })),
        },
      },
      include: { briques: { include: { brique: true } } },
    });

    for (const b of briques as LigneIn[]) {
      const qte = b.quantiteAjoutee ?? b.nombreSacs;
      await prisma.brique.update({ where: { id: b.briqueId }, data: { stockActuel: { increment: qte } } });
    }

    const ciment = await prisma.brique.findFirst({ where: { estCiment: true, userId } });
    let totalSacsUtilises = 0;
    for (const b of briques as LigneIn[]) {
      if (!b.soustraireCiment || !b.nombreSacs) continue;
      if (!ciment?.id) continue;
      totalSacsUtilises += b.nombreSacs;
      await prisma.brique.update({ where: { id: ciment.id }, data: { stockActuel: { decrement: b.nombreSacs } } });
    }
    if (totalSacsUtilises > 0 && ciment?.id) {
      await prisma.sortieStock.create({
        data: { userId, briqueId: ciment.id, quantite: totalSacsUtilises, type: "production", productionJourId: production.id, notes: `Sacs ciment utilisés en production du ${dateObj.toLocaleDateString("fr-FR")}`, date: dateObj },
      });
    }

    return NextResponse.json(production, { status: 201 });
  } catch (err) {
    console.error("POST /api/production error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur serveur" }, { status: 500 });
  }
}
