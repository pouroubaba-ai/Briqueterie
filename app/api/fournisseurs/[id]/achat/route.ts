import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const fournisseurId = Number(id);
    const { lignes, notes, date, versementImmédiat } = await req.json();

    if (!lignes || lignes.length === 0) {
      return NextResponse.json({ error: "Au moins une ligne requise" }, { status: 400 });
    }
    for (const l of lignes) {
      if (!l.briqueId || l.quantite <= 0 || l.prixUnit <= 0) {
        return NextResponse.json({ error: "Chaque ligne doit avoir un produit, une quantité et un prix" }, { status: 400 });
      }
    }

    const montantTotal = lignes.reduce((s: number, l: { quantite: number; prixUnit: number }) => s + l.quantite * l.prixUnit, 0);
    const montantVerse = Math.min(versementImmédiat ?? 0, montantTotal);
    const statut = montantVerse >= montantTotal ? "solde" : montantVerse > 0 ? "partiel" : "impaye";

    const achat = await prisma.achatFournisseur.create({
      data: {
        fournisseurId,
        date: date ? new Date(date) : new Date(),
        notes: notes ?? "",
        montantTotal,
        montantVerse,
        statut,
        lignes: {
          create: lignes.map((l: { briqueId: number; quantite: number; prixUnit: number }) => ({
            briqueId: Number(l.briqueId),
            quantite: Number(l.quantite),
            prixUnit: Number(l.prixUnit),
          })),
        },
      },
      include: { lignes: true },
    });

    // Incrémenter le stock pour chaque produit
    for (const l of lignes) {
      await prisma.brique.update({
        where: { id: Number(l.briqueId) },
        data: { stockActuel: { increment: Number(l.quantite) } },
      });
    }

    // Si versement immédiat, enregistrer le versement lié à cet achat
    if (montantVerse > 0) {
      await prisma.versementFournisseur.create({
        data: {
          fournisseurId,
          achatId: achat.id,
          montant: montantVerse,
          date: date ? new Date(date) : new Date(),
          notes: `Versement à l'achat`,
        },
      });
    }

    return NextResponse.json(achat, { status: 201 });
  } catch (err) {
    console.error("POST achat fournisseur:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
