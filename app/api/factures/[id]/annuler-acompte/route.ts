export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const factureId = Number(id);

  const facture = await prisma.facture.findUnique({
    where: { id: factureId },
    include: { livraison: { include: { commande: true, lignes: { include: { brique: true } } } }, paiements: true },
  });
  if (!facture) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });

  const acompte = facture.livraison.commande.acompte;
  if (!acompte || acompte <= 0) return NextResponse.json({ error: "Aucun acompte à annuler" }, { status: 400 });

  // Remettre l'acompte à 0 sur la commande
  await prisma.commande.update({ where: { id: facture.livraison.commande.id }, data: { acompte: 0 } });

  // Recalculer le statut de la facture sans l'acompte
  const totalFacture = facture.livraison.lignes.reduce((s, l) => s + l.quantiteLivree * (l.prixUnit || l.brique.prixVente), 0) + facture.transport;
  const totalPaye = facture.paiements.reduce((s, p) => s + p.montant, 0);
  const statut = totalPaye >= totalFacture ? "payee" : totalPaye > 0 ? "partielle" : "impayee";
  await prisma.facture.update({ where: { id: factureId }, data: { statut } });

  return NextResponse.json({ ok: true });
}
