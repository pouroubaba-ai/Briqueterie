export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const { montant } = await req.json();
  const prod = await prisma.productionJour.findUnique({ where: { id: Number(id) } });
  if (!prod) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (prod.statut === "annule") return NextResponse.json({ error: "Production annulée" }, { status: 400 });

  const resteAVerser = prod.montantDu - prod.montantVerse;
  if (montant > resteAVerser) return NextResponse.json({ error: `Montant trop élevé. Reste à verser : ${resteAVerser}` }, { status: 400 });

  const nouveauVerse = prod.montantVerse + montant;
  const updated = await prisma.productionJour.update({
    where: { id: Number(id) },
    data: { montantVerse: nouveauVerse, statut: nouveauVerse >= prod.montantDu ? "solde" : "partiel" },
    include: { briques: { include: { brique: true } } },
  });
  return NextResponse.json(updated);
}
