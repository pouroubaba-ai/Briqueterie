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

  // Auto-créer la facture
  const factureCount = await prisma.facture.count({ where: { userId } });
  const factureNumero = `FAC-${new Date().getFullYear()}-${String(factureCount + 1).padStart(3, "0")}`;
  const dateEcheance = new Date(); dateEcheance.setDate(dateEcheance.getDate() + 14);
  const transportCommande = commande?.transport ?? 0;
  const facture = await prisma.facture.create({
    data: { userId, numero: factureNumero, livraisonId: livraison.id, dateEcheance, transport: transportCommande, notes: "" },
    include: { livraison: { include: { commande: true, lignes: { include: { brique: true } } } } },
  });
  // Appliquer l'acompte si existant
  const acompte = commande?.acompte ?? 0;
  if (acompte > 0) {
    const totalFacture = livraison.lignes.reduce((s, l) => s + l.quantiteLivree * (l.prixUnit || 0), 0) + transportCommande;
    const statut = acompte >= totalFacture ? "payee" : "partielle";
    await prisma.facture.update({ where: { id: facture.id }, data: { statut } });
  }

  return NextResponse.json(livraison, { status: 201 });
}
