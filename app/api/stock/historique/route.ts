import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const mouvements: Mouvement[] = [];

  // ENTRÉES — Productions
  const productions = await prisma.productionJour.findMany({
    include: { briques: { include: { brique: true } } },
    orderBy: { date: "desc" },
  });
  for (const p of productions) {
    mouvements.push({
      id: `prod-${p.id}`,
      type: "entree",
      categorie: "production",
      date: p.date.toISOString(),
      source: "Production",
      notes: p.notes,
      produits: p.briques.map(b => ({
        briqueId: b.briqueId,
        nom: b.brique.nom,
        dimensions: b.brique.dimensions,
        quantite: b.quantiteAjoutee || b.nombreSacs,
        unite: "unités",
      })),
    });
  }

  // SORTIES — Stock (vol, casse, perte, annulation production, autre)
  const sorties = await prisma.sortieStock.findMany({
    include: { brique: true },
    orderBy: { date: "desc" },
  });
  for (const s of sorties) {
    mouvements.push({
      id: `sortie-${s.id}`,
      type: "sortie",
      categorie: s.type,
      date: s.date.toISOString(),
      source: s.notes || s.type,
      notes: s.notes,
      produits: [{
        briqueId: s.briqueId,
        nom: s.brique.nom,
        dimensions: s.brique.dimensions,
        quantite: s.quantite,
        unite: "unités",
      }],
    });
  }

  // SORTIES — Ventes (livraisons)
  const livraisons = await prisma.livraison.findMany({
    include: {
      commande: { include: { client: true } },
      lignes: { include: { brique: true } },
    },
    orderBy: { dateLivraison: "desc" },
  });
  for (const l of livraisons) {
    mouvements.push({
      id: `livr-${l.id}`,
      type: "sortie",
      categorie: "vente",
      date: l.dateLivraison.toISOString(),
      source: l.commande.client.nom,
      notes: l.notes,
      produits: l.lignes.map(li => ({
        briqueId: li.briqueId,
        nom: li.brique.nom,
        dimensions: li.brique.dimensions,
        quantite: li.quantiteLivree,
        unite: "unités",
      })),
    });
  }

  mouvements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return NextResponse.json(mouvements);
}

type Mouvement = {
  id: string;
  type: "entree" | "sortie";
  categorie: string;
  date: string;
  source: string;
  notes: string;
  produits: { briqueId: number; nom: string; dimensions: string | null; quantite: number; unite: string }[];
};
