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

  const facture = await prisma.facture.create({
    data: { userId, numero, livraisonId, dateEcheance: new Date(dateEcheance), transport: transport ?? 0, notes: notes ?? "" },
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
