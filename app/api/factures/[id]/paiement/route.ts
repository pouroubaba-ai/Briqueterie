export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

async function recalculStatut(factureId: number) {
  const facture = await prisma.facture.findUnique({
    where: { id: factureId },
    include: { paiements: true, livraison: { include: { lignes: { include: { brique: true } }, commande: true } } },
  });
  if (!facture) return;
  const totalFacture = facture.livraison.lignes.reduce((s, l) => s + l.quantiteLivree * (l.prixUnit || l.brique.prixVente), 0) + facture.transport;
  const acompte = facture.livraison.commande.acompte ?? 0;
  const totalPaye = facture.paiements.reduce((s, p) => s + p.montant, 0) + acompte;
  const statut = totalPaye >= totalFacture ? "payee" : totalPaye > 0 ? "partielle" : "impayee";
  await prisma.facture.update({ where: { id: factureId }, data: { statut } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const factureId = Number(id);
  const { montant, notes } = await req.json();

  const facture = await prisma.facture.findUnique({
    where: { id: factureId },
    include: { paiements: true, livraison: { include: { lignes: { include: { brique: true } }, commande: true } } },
  });
  if (!facture) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalFacture = facture.livraison.lignes.reduce((s, l) => s + l.quantiteLivree * (l.prixUnit || l.brique.prixVente), 0) + facture.transport;
  const acompte = facture.livraison.commande.acompte ?? 0;
  const totalPaye = facture.paiements.reduce((s, p) => s + p.montant, 0) + acompte;
  const reste = totalFacture - totalPaye;

  if (montant > reste) {
    return NextResponse.json({ error: "EXCEED_DEBT", message: `Le montant dépasse la dette restante de ${reste}` }, { status: 422 });
  }

  await prisma.paiement.create({ data: { userId, factureId, montant, notes: notes ?? "" } });
  await recalculStatut(factureId);

  const updated = await prisma.facture.findUnique({
    where: { id: factureId },
    include: { paiements: true, livraison: { include: { lignes: { include: { brique: true } }, commande: { include: { client: true } } } } },
  });
  return NextResponse.json(updated, { status: 201 });
}
