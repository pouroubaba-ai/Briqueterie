export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const groupes = await prisma.versementGroupe.findMany({
    where: { userId },
    include: { lignes: { include: { productionJour: true }, orderBy: { productionJour: { date: "asc" } } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(groupes);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const { montantTotal, notes } = await req.json();
    if (!montantTotal || montantTotal <= 0) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });

    const dettes = await prisma.productionJour.findMany({
      where: { userId, statut: { in: ["impaye", "partiel"] } },
      orderBy: { date: "asc" },
    });

    if (dettes.length < 2) return NextResponse.json({ error: "Pas assez de dettes pour un versement groupé" }, { status: 400 });

    let restant = montantTotal;
    const repartition: { prod: typeof dettes[0]; montant: number }[] = [];
    for (const p of dettes) {
      if (restant <= 0) break;
      const reste = p.montantDu - p.montantVerse;
      const montant = Math.min(reste, restant);
      if (montant > 0) { repartition.push({ prod: p, montant }); restant -= montant; }
    }

    const montantEffectif = repartition.reduce((s, l) => s + l.montant, 0);
    const groupe = await prisma.versementGroupe.create({
      data: { userId, montantTotal: montantEffectif, notes: notes ?? "", lignes: { create: repartition.map(({ prod, montant }) => ({ productionJourId: prod.id, montant })) } },
      include: { lignes: { include: { productionJour: true } } },
    });

    for (const { prod, montant } of repartition) {
      const nouveauVerse = prod.montantVerse + montant;
      await prisma.productionJour.update({ where: { id: prod.id }, data: { montantVerse: nouveauVerse, statut: nouveauVerse >= prod.montantDu ? "solde" : "partiel" } });
    }

    return NextResponse.json(groupe, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur serveur" }, { status: 500 });
  }
}
