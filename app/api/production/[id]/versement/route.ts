import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { montant } = await req.json();
  const prod = await prisma.productionJour.findUnique({ where: { id: Number(id) } });
  if (!prod) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (prod.statut === "annule") return NextResponse.json({ error: "Production annulée" }, { status: 400 });

  const resteAVerser = prod.montantDu - prod.montantVerse;
  if (montant > resteAVerser) {
    return NextResponse.json(
      { error: `Montant trop élevé. Reste à verser : ${resteAVerser}` },
      { status: 400 }
    );
  }

  const nouveauVerse = prod.montantVerse + montant;
  const statut = nouveauVerse >= prod.montantDu ? "solde" : "partiel";

  const updated = await prisma.productionJour.update({
    where: { id: Number(id) },
    data: { montantVerse: nouveauVerse, statut },
    include: { briques: { include: { brique: true } } },
  });
  return NextResponse.json(updated);
}
