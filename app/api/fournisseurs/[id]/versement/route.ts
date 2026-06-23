import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const fournisseurId = Number(id);
    const { montant, notes, date } = await req.json();

    if (!montant || montant <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    // Récupérer les achats impayés/partiels, du plus ancien au plus récent
    const dettes = await prisma.achatFournisseur.findMany({
      where: { fournisseurId, statut: { in: ["impaye", "partiel"] } },
      orderBy: { date: "asc" },
    });

    const totalDu = dettes.reduce((s, a) => s + (a.montantTotal - a.montantVerse), 0);
    if (montant > totalDu) {
      return NextResponse.json({ error: `Le versement (${montant}) dépasse la dette totale (${totalDu})` }, { status: 400 });
    }

    // Répartir oldest-first
    let restant = montant;
    for (const dette of dettes) {
      if (restant <= 0) break;
      const resteAchat = dette.montantTotal - dette.montantVerse;
      const aVerser = Math.min(restant, resteAchat);
      const nouveauVerse = dette.montantVerse + aVerser;
      const nouveauStatut = nouveauVerse >= dette.montantTotal ? "solde" : "partiel";
      await prisma.achatFournisseur.update({
        where: { id: dette.id },
        data: { montantVerse: nouveauVerse, statut: nouveauStatut },
      });
      restant -= aVerser;
    }

    // Enregistrer le versement (= dépense)
    const versement = await prisma.versementFournisseur.create({
      data: {
        fournisseurId,
        montant,
        notes: notes ?? "",
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json(versement, { status: 201 });
  } catch (err) {
    console.error("POST versement fournisseur:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
