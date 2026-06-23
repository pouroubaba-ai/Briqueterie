export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const { id } = await params;
    const prod = await prisma.productionJour.findUnique({ where: { id: Number(id) }, include: { briques: { include: { brique: true } } } });
    if (!prod) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (prod.statut === "annule") return NextResponse.json({ error: "Déjà annulée" }, { status: 400 });

    const dateAnnul = new Date();
    for (const b of prod.briques) {
      await prisma.brique.update({ where: { id: b.briqueId }, data: { stockActuel: { decrement: b.quantiteAjoutee } } });
      await prisma.sortieStock.create({
        data: { userId, briqueId: b.briqueId, quantite: b.quantiteAjoutee, type: "annulation_production", notes: `Annulation production du ${prod.date.toLocaleDateString("fr-FR")}`, date: dateAnnul },
      });
    }

    const updated = await prisma.productionJour.update({
      where: { id: Number(id) },
      data: { statut: "annule", montantVerse: 0 },
      include: { briques: { include: { brique: true } } },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur serveur" }, { status: 500 });
  }
}
