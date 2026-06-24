export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const { id } = await params;
    const prodId = Number(id);
    const prod = await prisma.productionJour.findUnique({
      where: { id: prodId },
      include: { briques: { include: { brique: true } } },
    });
    if (!prod) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (prod.statut === "annule") return NextResponse.json({ error: "Déjà annulée" }, { status: 400 });

    // Vérifier que le stock de chaque produit est suffisant avant d'annuler
    for (const b of prod.briques) {
      if (b.brique.stockActuel < b.quantiteAjoutee) {
        return NextResponse.json({
          error: `Stock insuffisant pour "${b.brique.nom}${b.brique.dimensions ? ` — ${b.brique.dimensions}` : ""}" : stock actuel ${b.brique.stockActuel} unité(s), production à annuler ${b.quantiteAjoutee} unité(s).`,
        }, { status: 400 });
      }
    }

    const dateAnnul = new Date();
    const label = `Annulation production du ${prod.date.toLocaleDateString("fr-FR")}`;

    // 1. Retirer les briques produites du stock + sortie
    for (const b of prod.briques) {
      await prisma.brique.update({ where: { id: b.briqueId }, data: { stockActuel: { decrement: b.quantiteAjoutee } } });
      await prisma.sortieStock.create({
        data: { userId, briqueId: b.briqueId, quantite: b.quantiteAjoutee, type: "annulation_production", notes: label, date: dateAnnul },
      });
    }

    // 2. Retourner le ciment UNIQUEMENT si cette production en a vraiment utilisé
    const sortieCiment = await prisma.sortieStock.findFirst({
      where: { productionJourId: prodId, type: "production" },
    });

    if (sortieCiment) {
      await prisma.brique.update({ where: { id: sortieCiment.briqueId }, data: { stockActuel: { increment: sortieCiment.quantite } } });
      await prisma.sortieStock.create({
        data: { userId, briqueId: sortieCiment.briqueId, quantite: sortieCiment.quantite, type: "retour_ciment", productionJourId: prodId, notes: label, date: dateAnnul },
      });
    }

    const updated = await prisma.productionJour.update({
      where: { id: prodId },
      data: { statut: "annule", montantVerse: 0, montantDu: 0 },
      include: { briques: { include: { brique: true } } },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur serveur" }, { status: 500 });
  }
}
