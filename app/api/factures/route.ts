export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const factures = await prisma.facture.findMany({
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

export async function POST(req: Request) {
  const { livraisonId, dateEcheance, transport, notes } = await req.json();
  const count = await prisma.facture.count();
  const numero = `FAC-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

  const facture = await prisma.facture.create({
    data: {
      numero,
      livraisonId,
      dateEcheance: new Date(dateEcheance),
      transport: transport ?? 0,
      notes: notes ?? "",
    },
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
  return NextResponse.json(facture, { status: 201 });
}
