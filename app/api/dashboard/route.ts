export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

function granulariteAuto(de: Date, a: Date) {
  const diff = (a.getTime() - de.getTime()) / 86400000;
  if (diff <= 1) return "heure";
  if (diff <= 8) return "jour";
  return "mois";
}

async function getCaDepenses(userId: number, de: Date, a: Date) {
  const [factures, productions, versements, depenses] = await Promise.all([
    prisma.facture.findMany({ where: { userId, createdAt: { gte: de, lt: a } }, include: { paiements: true } }),
    prisma.productionJour.findMany({ where: { userId, date: { gte: de, lt: a }, statut: { not: "annule" } } }),
    prisma.versementFournisseur.findMany({ where: { fournisseur: { userId }, date: { gte: de, lt: a } } }),
    prisma.depense.findMany({ where: { userId, date: { gte: de, lt: a } } }),
  ]);
  const ca = factures.reduce((s, f) => s + f.paiements.reduce((ps, p) => ps + p.montant, 0), 0);
  const dep = productions.reduce((s, p) => s + p.montantVerse, 0) + versements.reduce((s, v) => s + v.montant, 0) + depenses.reduce((s, d) => s + d.montant, 0);
  return { ca, dep };
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const deParam = searchParams.get("de");
  const aParam = searchParams.get("a");
  const now = new Date();
  const debut = deParam ? new Date(deParam + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
  const fin = aParam ? new Date(aParam + "T23:59:59") : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const granularite = granulariteAuto(debut, fin);

  const [briques, factures, sorties, productions, versementsFourn, depensesDiverses, tousLesAchats, tousLesVersementsFourn] = await Promise.all([
    prisma.brique.findMany({ where: { userId } }),
    prisma.facture.findMany({ where: { userId }, include: { paiements: true, livraison: { include: { lignes: { include: { brique: true } }, commande: { include: { client: true } } } } }, orderBy: { createdAt: "desc" } }),
    prisma.sortieStock.findMany({ where: { userId, date: { gte: debut, lte: fin }, type: { notIn: ["production", "annulation_production", "retour_ciment"] } }, include: { brique: true } }),
    prisma.productionJour.findMany({ where: { userId, date: { gte: debut, lte: fin }, statut: { not: "annule" } }, include: { briques: { include: { brique: true } } } }),
    prisma.versementFournisseur.findMany({ where: { fournisseur: { userId }, date: { gte: debut, lte: fin } } }),
    prisma.depense.findMany({ where: { userId, date: { gte: debut, lte: fin } } }),
    prisma.achatFournisseur.findMany({ where: { fournisseur: { userId } }, include: { fournisseur: true } }),
    prisma.versementFournisseur.findMany({ where: { fournisseur: { userId } } }),
  ]);

  const totalAchatsFourn = tousLesAchats.reduce((s, a) => s + a.montantTotal, 0);
  const totalVersementsFourn = tousLesVersementsFourn.reduce((s, v) => s + v.montant, 0);
  const resteDuFournisseurs = Math.max(0, totalAchatsFourn - totalVersementsFourn);

  const facturesPeriode = factures.filter(f => new Date(f.createdAt) >= debut && new Date(f.createdAt) <= fin);
  const totalFacture = facturesPeriode.reduce((s, f) => s + f.livraison.lignes.reduce((ls, l) => ls + l.quantiteLivree * (l.prixUnit || l.brique.prixVente), 0) + f.transport, 0);
  const totalPaye = facturesPeriode.reduce((s, f) => s + f.paiements.reduce((ps, p) => ps + p.montant, 0), 0);
  const recettes = totalFacture; // Toutes les ventes (payées + impayées)
  const impayesMois = totalFacture - totalPaye;
  const depensesProduction = productions.reduce((s, p) => s + p.montantVerse, 0);
  const depensesFournisseurs = versementsFourn.reduce((s, v) => s + v.montant, 0);
  const depensesDiversesTotal = depensesDiverses.reduce((s, d) => s + d.montant, 0);
  const depenses = depensesProduction + depensesFournisseurs + depensesDiversesTotal;
  const beneficeNet = recettes - depenses;
  const resteAVerser = productions.reduce((s, p) => s + Math.max(0, p.montantDu - p.montantVerse), 0);
  const totalStockValeur = briques.reduce((s, b) => s + b.stockActuel * b.prixVente, 0);
  const totalPertes = sorties.reduce((s, st) => s + st.quantite * st.brique.prixVente, 0);

  type Point = { label: string; ca: number; depenses: number };
  const historique: Point[] = [];

  if (granularite === "heure") {
    for (let h = 0; h < 24; h++) {
      const deb = new Date(debut); deb.setHours(h, 0, 0, 0);
      const fin2 = new Date(debut); fin2.setHours(h + 1, 0, 0, 0);
      const { ca, dep } = await getCaDepenses(userId, deb, fin2);
      historique.push({ label: `${h}h`, ca, depenses: dep });
    }
  } else if (granularite === "jour") {
    const cursor = new Date(debut); cursor.setHours(0, 0, 0, 0);
    const end = new Date(fin); end.setHours(23, 59, 59, 999);
    while (cursor <= end) {
      const deb = new Date(cursor);
      const fin2 = new Date(cursor); fin2.setDate(fin2.getDate() + 1);
      const { ca, dep } = await getCaDepenses(userId, deb, fin2);
      historique.push({ label: deb.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), ca, depenses: dep });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    const cursor = new Date(debut.getFullYear(), debut.getMonth(), 1);
    const end = new Date(fin.getFullYear(), fin.getMonth() + 1, 1);
    while (cursor < end) {
      const deb = new Date(cursor);
      const fin2 = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const { ca, dep } = await getCaDepenses(userId, deb, fin2);
      historique.push({ label: deb.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }), ca, depenses: dep });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  const repartitionDepenses = [
    { name: "Production", value: depensesProduction, color: "#f59e0b" },
    { name: "Fournisseurs", value: depensesFournisseurs, color: "#3b82f6" },
    { name: "Dépenses", value: depensesDiversesTotal, color: "#ef4444" },
  ].filter(r => r.value > 0);

  const clientMap: Record<number, { id: number; nom: string; total: number }> = {};
  for (const f of factures) {
    const client = f.livraison.commande.client;
    const paye = f.paiements.filter(p => new Date(p.date) >= debut && new Date(p.date) <= fin).reduce((s, p) => s + p.montant, 0);
    if (!clientMap[client.id]) clientMap[client.id] = { id: client.id, nom: client.nom, total: 0 };
    clientMap[client.id].total += paye;
  }
  const top5Clients = Object.values(clientMap).filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);

  const fournMap: Record<number, { id: number; nom: string; total: number }> = {};
  for (const a of tousLesAchats) {
    if (!fournMap[a.fournisseurId]) fournMap[a.fournisseurId] = { id: a.fournisseurId, nom: a.fournisseur.nom, total: 0 };
    fournMap[a.fournisseurId].total += a.montantTotal;
  }
  const top5Fournisseurs = Object.values(fournMap).sort((a, b) => b.total - a.total).slice(0, 5);

  const facturesRecentes = factures.slice(0, 5).map(f => {
    const total = f.livraison.lignes.reduce((s, l) => s + l.quantiteLivree * (l.prixUnit || l.brique.prixVente), 0) + f.transport;
    const paye = f.paiements.reduce((s, p) => s + p.montant, 0);
    return { ...f, totalFacture: total, totalPaye: paye, resteAPayer: total - paye };
  });

  return NextResponse.json({
    briques, totalStockValeur, recettes, totalPaye, impayesMois, depenses,
    depensesProduction, depensesFournisseurs, depensesDiverses: depensesDiversesTotal,
    beneficeNet, totalPertes, resteAVerser, resteDuFournisseurs,
    facturesRecentes,
    sortiesMois: sorties.map(s => ({ ...s, valeur: s.quantite * s.brique.prixVente })),
    productionsMois: productions, historique, repartitionDepenses, top5Clients, top5Fournisseurs,
  });
}
