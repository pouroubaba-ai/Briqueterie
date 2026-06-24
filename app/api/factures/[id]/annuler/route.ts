export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const facture = await prisma.facture.findUnique({ where: { id: Number(id) }, include: { livraison: { include: { lignes: true } } } });
  if (!facture) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  if (facture.statut === "annulee") return NextResponse.json({ error: "Déjà annulée" }, { status: 400 });

  for (const l of facture.livraison.lignes) {
    await prisma.brique.update({ where: { id: l.briqueId }, data: { stockActuel: { increment: l.quantiteLivree } } });
    await prisma.sortieStock.create({
      data: {
        userId,
        briqueId: l.briqueId,
        quantite: -l.quantiteLivree,
        type: "retour_vente",
        notes: `Retour suite annulation facture ${facture.numero ?? ""}`,
        date: new Date(),
      },
    });
  }
  await prisma.commande.update({ where: { id: facture.livraison.commandeId }, data: { statut: "confirme" } });
  const updated = await prisma.facture.update({ where: { id: Number(id) }, data: { statut: "annulee" } });
  return NextResponse.json(updated);
}
