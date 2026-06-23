export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function recalculStatut(factureId: number) {
  const facture = await prisma.facture.findUnique({
    where: { id: factureId },
    include: {
      paiements: true,
      livraison: { include: { lignes: { include: { brique: true } } } },
    },
  });
  if (!facture) return;

  const totalFacture =
    facture.livraison.lignes.reduce((s, l) => s + l.quantiteLivree * l.brique.prixVente, 0) +
    facture.transport;
  const totalPaye = facture.paiements.reduce((s, p) => s + p.montant, 0);
  const statut = totalPaye >= totalFacture ? "payee" : totalPaye > 0 ? "partielle" : "impayee";

  await prisma.facture.update({ where: { id: factureId }, data: { statut } });
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paiementId = Number(id);

  const paiement = await prisma.paiement.findUnique({ where: { id: paiementId } });
  if (!paiement) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Annulation = paiement négatif lié au paiement original via notes (format: "annul:ID|...")
  await prisma.paiement.create({
    data: {
      factureId: paiement.factureId,
      montant: -paiement.montant,
      notes: `annul:${paiementId}|Annulation du ${new Date().toLocaleDateString("fr-FR")}`,
    },
  });

  await recalculStatut(paiement.factureId);

  return NextResponse.json({ success: true });
}
