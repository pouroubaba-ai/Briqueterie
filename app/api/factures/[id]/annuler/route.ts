export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const facture = await prisma.facture.findUnique({
    where: { id: Number(id) },
    include: { livraison: { include: { lignes: true } } },
  });

  if (!facture) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  if (facture.statut === "annulee") return NextResponse.json({ error: "Déjà annulée" }, { status: 400 });

  // Restaurer le stock des produits livrés
  for (const l of facture.livraison.lignes) {
    await prisma.brique.update({
      where: { id: l.briqueId },
      data: { stockActuel: { increment: l.quantiteLivree } },
    });
  }

  // Remettre la commande en "confirme"
  await prisma.commande.update({
    where: { id: facture.livraison.commandeId },
    data: { statut: "confirme" },
  });

  // Marquer la facture annulée
  const updated = await prisma.facture.update({
    where: { id: Number(id) },
    data: { statut: "annulee" },
  });

  return NextResponse.json(updated);
}
