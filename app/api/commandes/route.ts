export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const commandes = await prisma.commande.findMany({
    where: { userId },
    include: { client: true, lignes: { include: { brique: true } }, livraison: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(commandes);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { clientId, devisId, dateLivraisonPrevue, acompte, transport, notes, lignes } = await req.json();
  const count = await prisma.commande.count({ where: { userId } });
  const numero = `BC-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

  const commande = await prisma.commande.create({
    data: {
      userId, numero, clientId,
      devisId: devisId ?? null,
      dateLivraisonPrevue: dateLivraisonPrevue ? new Date(dateLivraisonPrevue) : null,
      acompte: acompte ?? 0,
      transport: transport ?? 0,
      notes: notes ?? "",
      lignes: { create: lignes },
    },
    include: { client: true, lignes: { include: { brique: true } } },
  });

  if (devisId) {
    await prisma.devis.update({ where: { id: devisId }, data: { statut: "confirme" } });
  }

  return NextResponse.json(commande, { status: 201 });
}
