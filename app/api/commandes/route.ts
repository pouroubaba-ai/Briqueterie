export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const commandes = await prisma.commande.findMany({
    include: { client: true, lignes: { include: { brique: true } }, livraison: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(commandes);
}

export async function POST(req: Request) {
  const { clientId, devisId, dateLivraisonPrevue, acompte, transport, notes, lignes } = await req.json();
  const count = await prisma.commande.count();
  const numero = `BC-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

  const commande = await prisma.commande.create({
    data: {
      numero,
      clientId,
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
