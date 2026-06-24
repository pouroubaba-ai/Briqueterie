export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const livraisons = await prisma.livraison.findMany({
    where: { userId },
    include: {
      commande: { include: { client: true } },
      lignes: { include: { brique: true } },
      facture: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(livraisons);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { commandeId, dateLivraison, livreur, notes, lignes } = await req.json();

  // Récupérer les prix de la commande
  const commande = await prisma.commande.findUnique({ where: { id: commandeId }, include: { lignes: true } });
  const prixParBrique: Record<number, number> = {};
  if (commande) {
    for (const l of commande.lignes) prixParBrique[l.briqueId] = l.prixUnit;
  }

  for (const l of lignes) {
    const brique = await prisma.brique.findUnique({ where: { id: l.briqueId } });
    if (brique && brique.stockActuel < l.quantiteLivree) {
      return NextResponse.json(
        { error: "STOCK_INSUFFISANT", message: `Stock insuffisant pour "${brique.nom}" — stock: ${brique.stockActuel}, demandé: ${l.quantiteLivree}` },
        { status: 400 }
      );
    }
  }

  const count = await prisma.livraison.count({ where: { userId } });
  const numero = `BL-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

  // Injecter le prixUnit de la commande dans chaque ligne
  const lignesAvecPrix = lignes.map((l: { briqueId: number; quantiteCommandee: number; quantiteLivree: number }) => ({
    ...l,
    prixUnit: prixParBrique[l.briqueId] ?? 0,
  }));

  const livraison = await prisma.livraison.create({
    data: { userId, numero, commandeId, dateLivraison: new Date(dateLivraison), livreur: livreur ?? "", notes: notes ?? "", lignes: { create: lignesAvecPrix } },
    include: { commande: { include: { client: true } }, lignes: { include: { brique: true } } },
  });

  for (const l of lignes) {
    await prisma.brique.update({ where: { id: l.briqueId }, data: { stockActuel: { decrement: l.quantiteLivree } } });
  }

  await prisma.commande.update({ where: { id: commandeId }, data: { statut: "livre" } });
  return NextResponse.json(livraison, { status: 201 });
}
