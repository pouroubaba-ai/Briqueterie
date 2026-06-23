import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const groupes = await prisma.versementGroupe.findMany({
    include: {
      lignes: {
        include: { productionJour: true },
        orderBy: { productionJour: { date: "asc" } },
      },
    },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(groupes);
}

export async function POST(req: Request) {
  try {
    const { montantTotal, notes } = await req.json();
    if (!montantTotal || montantTotal <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    // Productions impayées triées du plus ancien au plus récent
    const dettes = await prisma.productionJour.findMany({
      where: { statut: { in: ["impaye", "partiel"] } },
      orderBy: { date: "asc" },
    });

    if (dettes.length < 2) {
      return NextResponse.json({ error: "Pas assez de dettes pour un versement groupé" }, { status: 400 });
    }

    // Calculer la répartition
    let restant = montantTotal;
    const repartition: { prod: typeof dettes[0]; montant: number }[] = [];
    for (const p of dettes) {
      if (restant <= 0) break;
      const reste = p.montantDu - p.montantVerse;
      const montant = Math.min(reste, restant);
      if (montant > 0) { repartition.push({ prod: p, montant }); restant -= montant; }
    }

    const montantEffectif = repartition.reduce((s, l) => s + l.montant, 0);

    // Créer le versement groupé
    const groupe = await prisma.versementGroupe.create({
      data: {
        montantTotal: montantEffectif,
        notes: notes ?? "",
        lignes: {
          create: repartition.map(({ prod, montant }) => ({
            productionJourId: prod.id,
            montant,
          })),
        },
      },
      include: {
        lignes: { include: { productionJour: true } },
      },
    });

    // Mettre à jour chaque production
    for (const { prod, montant } of repartition) {
      const nouveauVerse = prod.montantVerse + montant;
      const statut = nouveauVerse >= prod.montantDu ? "solde" : "partiel";
      await prisma.productionJour.update({
        where: { id: prod.id },
        data: { montantVerse: nouveauVerse, statut },
      });
    }

    return NextResponse.json(groupe, { status: 201 });
  } catch (err) {
    console.error("POST /api/production/versement-groupe error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur serveur" }, { status: 500 });
  }
}
