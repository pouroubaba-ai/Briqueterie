export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const commandes = await prisma.commande.findMany({
    where: { userId, statut: { notIn: ["annule", "livre"] } },
    include: {
      client: true,
      lignes: { include: { brique: true } },
    },
  });

  // Totaux globaux par brique
  type ProduitMap = Record<number, {
    briqueId: number; nom: string; dimensions: string | null; prixUnit: number;
    totalCommandé: number;
    parClient: Record<number, { clientId: number; clientNom: string; quantite: number }>;
  }>;

  type ClientMap = Record<number, {
    clientId: number; clientNom: string;
    totalCommandé: number;
    parProduit: Record<number, { briqueId: number; nom: string; prixUnit: number; quantite: number }>;
  }>;

  const produits: ProduitMap = {};
  const clients: ClientMap = {};

  for (const cmd of commandes) {
    if (!clients[cmd.clientId]) {
      clients[cmd.clientId] = { clientId: cmd.clientId, clientNom: cmd.client.nom, totalCommandé: 0, parProduit: {} };
    }
    for (const l of cmd.lignes) {
      const prix = l.prixUnit;
      // Produits
      if (!produits[l.briqueId]) {
        produits[l.briqueId] = { briqueId: l.briqueId, nom: l.brique.nom, dimensions: l.brique.dimensions, prixUnit: prix, totalCommandé: 0, parClient: {} };
      }
      produits[l.briqueId].totalCommandé += l.quantite;
      if (!produits[l.briqueId].parClient[cmd.clientId]) {
        produits[l.briqueId].parClient[cmd.clientId] = { clientId: cmd.clientId, clientNom: cmd.client.nom, quantite: 0 };
      }
      produits[l.briqueId].parClient[cmd.clientId].quantite += l.quantite;

      // Clients
      clients[cmd.clientId].totalCommandé += l.quantite * prix;
      if (!clients[cmd.clientId].parProduit[l.briqueId]) {
        clients[cmd.clientId].parProduit[l.briqueId] = { briqueId: l.briqueId, nom: l.brique.nom, prixUnit: prix, quantite: 0 };
      }
      clients[cmd.clientId].parProduit[l.briqueId].quantite += l.quantite;
    }
  }

  // Récupérer stock actuel de chaque brique concernée
  const briqueIds = Object.keys(produits).map(Number);
  const briques = await prisma.brique.findMany({ where: { id: { in: briqueIds } } });
  const stockMap: Record<number, number> = {};
  for (const b of briques) stockMap[b.id] = b.stockActuel;

  // Construire vue produits
  const vueProduits = Object.values(produits).map(p => {
    const stock = stockMap[p.briqueId] ?? 0;
    const dispo = Math.min(p.totalCommandé, stock);
    const restant = Math.max(0, p.totalCommandé - stock);
    return {
      briqueId: p.briqueId,
      nom: p.nom,
      dimensions: p.dimensions,
      prixUnit: p.prixUnit,
      qteCommandée: p.totalCommandé,
      qteDispo: dispo,
      qteRestante: restant,
      valCommandée: p.totalCommandé * p.prixUnit,
      valDispo: dispo * p.prixUnit,
      valRestante: restant * p.prixUnit,
      parClient: Object.values(p.parClient).map(c => {
        const cdispo = Math.min(c.quantite, stock);
        return {
          clientId: c.clientId,
          clientNom: c.clientNom,
          qteCommandée: c.quantite,
          qteDispo: cdispo,
          qteRestante: Math.max(0, c.quantite - stock),
          valCommandée: c.quantite * p.prixUnit,
          valDispo: cdispo * p.prixUnit,
          valRestante: Math.max(0, c.quantite - stock) * p.prixUnit,
        };
      }),
    };
  });

  // Construire vue clients
  const vueClients = Object.values(clients).map(c => {
    const parProduit = Object.values(c.parProduit).map(p => {
      const stock = stockMap[p.briqueId] ?? 0;
      const dispo = Math.min(p.quantite, stock);
      const restant = Math.max(0, p.quantite - stock);
      return {
        briqueId: p.briqueId,
        nom: p.nom,
        prixUnit: p.prixUnit,
        qteCommandée: p.quantite,
        qteDispo: dispo,
        qteRestante: restant,
        valCommandée: p.quantite * p.prixUnit,
        valDispo: dispo * p.prixUnit,
        valRestante: restant * p.prixUnit,
      };
    });
    const totalVal = parProduit.reduce((s, p) => s + p.valCommandée, 0);
    const totalDispo = parProduit.reduce((s, p) => s + p.valDispo, 0);
    const totalRestant = parProduit.reduce((s, p) => s + p.valRestante, 0);
    return { clientId: c.clientId, clientNom: c.clientNom, valCommandée: totalVal, valDispo: totalDispo, valRestante: totalRestant, parProduit };
  });

  const globalCmdVal = vueProduits.reduce((s, p) => s + p.valCommandée, 0);
  const globalDispoVal = vueProduits.reduce((s, p) => s + p.valDispo, 0);
  const globalRestantVal = vueProduits.reduce((s, p) => s + p.valRestante, 0);

  return NextResponse.json({ global: { valCommandée: globalCmdVal, valDispo: globalDispoVal, valRestante: globalRestantVal }, vueProduits, vueClients });
}
