export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const factures = await prisma.facture.findMany({
    where: { userId },
    include: {
      livraison: {
        include: {
          commande: { include: { client: true } },
          lignes: { include: { brique: true } },
        },
      },
      paiements: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(factures);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { livraisonId, dateEcheance, transport, notes } = await req.json();
  const count = await prisma.facture.count({ where: { userId } });
  const numero = `FAC-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

  // Si transport non fourni, récupérer celui de la commande
  let transportFinal = transport ?? 0;
  if (!transport || transport === 0) {
    const livraison = await prisma.livraison.findUnique({
      where: { id: livraisonId },
      include: { commande: true, lignes: { include: { brique: true } } },
    });
    if (livraison) {
      transportFinal = livraison.commande.transport ?? 0;
    }
  }

  const facture = await prisma.facture.create({
    data: { userId, numero, livraisonId, dateEcheance: new Date(dateEcheance), transport: transportFinal, notes: notes ?? "" },
    include: {
      livraison: {
        include: {
          commande: { include: { client: true } },
          lignes: { include: { brique: true } },
        },
      },
      paiements: true,
    },
  });

  // Recalculer le statut initial en tenant compte de l'acompte
  const acompte = facture.livraison.commande.acompte ?? 0;
  if (acompte > 0) {
    const totalFacture = facture.livraison.lignes.reduce((s, l) => s + l.quantiteLivree * (l.prixUnit || l.brique.prixVente), 0) + transportFinal;
    const statut = acompte >= totalFacture ? "payee" : "partielle";
    await prisma.facture.update({ where: { id: facture.id }, data: { statut } });
    return NextResponse.json({ ...facture, statut, transport: transportFinal }, { status: 201 });
  }

  return NextResponse.json(facture, { status: 201 });
}
