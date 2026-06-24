export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const { id } = await params;
    const prod = await prisma.productionJour.findUnique({
      where: { id: Number(id) },
      include: { briques: { include: { brique: true } } },
    });
    if (!prod) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (prod.statut === "annule") return NextResponse.json({ error: "Déjà annulée" }, { status: 400 });

    const dateAnnul = new Date();
    const label = `Annulation production du ${prod.date.toLocaleDateString("fr-FR")}`;

    // 1. Retirer les briques produites du stock + sortie
    for (const b of prod.briques) {
      await prisma.brique.update({ where: { id: b.briqueId }, data: { stockActuel: { decrement: b.quantiteAjoutee } } });
      await prisma.sortieStock.create({
        data: { userId, briqueId: b.briqueId, quantite: b.quantiteAjoutee, type: "annulation_production", notes: label, date: dateAnnul },
      });
    }

    // 2. Retourner les sacs de ciment consommés
    const totalSacs = prod.briques.reduce((s, b) => s + b.nombreSacs, 0);
    if (totalSacs > 0) {
      const ciment = await prisma.brique.findFirst({ where: { userId, estCiment: true } });
      if (ciment) {
        await prisma.brique.update({ where: { id: ciment.id }, data: { stockActuel: { increment: totalSacs } } });
        // Créer une entrée de type "retour_ciment" visible dans l'historique comme entrée
        await prisma.sortieStock.create({
          data: { userId, briqueId: ciment.id, quantite: totalSacs, type: "retour_ciment", notes: label, date: dateAnnul },
        });
      }
    }

    const updated = await prisma.productionJour.update({
      where: { id: Number(id) },
      data: { statut: "annule", montantVerse: 0, montantDu: 0 },
      include: { briques: { include: { brique: true } } },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur serveur" }, { status: 500 });
  }
}
