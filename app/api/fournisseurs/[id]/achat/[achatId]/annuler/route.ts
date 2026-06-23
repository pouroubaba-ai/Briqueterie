import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ id: string; achatId: string }> }) {
  const { achatId } = await params;

  const achat = await prisma.achatFournisseur.findUnique({
    where: { id: Number(achatId) },
    include: { lignes: { include: { brique: true } } },
  });

  if (!achat) return NextResponse.json({ error: "Achat introuvable" }, { status: 404 });
  if (achat.statut === "annule") return NextResponse.json({ error: "Déjà annulé" }, { status: 400 });

  // Vérifier que le stock suffit pour annuler chaque ligne
  for (const l of achat.lignes) {
    if (l.brique.stockActuel < l.quantite) {
      return NextResponse.json({
        error: `Stock insuffisant pour annuler — "${l.brique.nom}" : stock actuel ${l.brique.stockActuel}, quantité à retirer ${l.quantite}`,
      }, { status: 400 });
    }
  }

  // Décrémenter le stock pour chaque ligne
  for (const l of achat.lignes) {
    await prisma.brique.update({
      where: { id: l.briqueId },
      data: { stockActuel: { decrement: l.quantite } },
    });
  }

  // Supprimer les versements liés à cet achat (annule leur effet sur les dépenses)
  await prisma.versementFournisseur.deleteMany({
    where: { achatId: Number(achatId) },
  });

  // Marquer l'achat comme annulé
  const updated = await prisma.achatFournisseur.update({
    where: { id: Number(achatId) },
    data: { statut: "annule" },
  });

  return NextResponse.json(updated);
}
