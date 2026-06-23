export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const { id } = await params;
    const fournisseurId = Number(id);
    const { montant, notes, date } = await req.json();

    if (!montant || montant <= 0) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });

    const dettes = await prisma.achatFournisseur.findMany({
      where: { fournisseurId, statut: { in: ["impaye", "partiel"] } },
      orderBy: { date: "asc" },
    });

    const totalDu = dettes.reduce((s, a) => s + (a.montantTotal - a.montantVerse), 0);
    if (montant > totalDu) return NextResponse.json({ error: `Le versement (${montant}) dépasse la dette totale (${totalDu})` }, { status: 400 });

    let restant = montant;
    for (const dette of dettes) {
      if (restant <= 0) break;
      const resteAchat = dette.montantTotal - dette.montantVerse;
      const aVerser = Math.min(restant, resteAchat);
      const nouveauVerse = dette.montantVerse + aVerser;
      await prisma.achatFournisseur.update({ where: { id: dette.id }, data: { montantVerse: nouveauVerse, statut: nouveauVerse >= dette.montantTotal ? "solde" : "partiel" } });
      restant -= aVerser;
    }

    const versement = await prisma.versementFournisseur.create({
      data: { fournisseurId, montant, notes: notes ?? "", date: date ? new Date(date) : new Date() },
    });
    return NextResponse.json(versement, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
