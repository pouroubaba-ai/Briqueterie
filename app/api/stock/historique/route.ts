export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

type Mouvement = {
  id: string; type: "entree" | "sortie"; categorie: string; date: string;
  source: string; notes: string;
  produits: { briqueId: number; nom: string; dimensions: string | null; quantite: number; unite: string }[];
};

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const mouvements: Mouvement[] = [];

  const [productions, sorties, livraisons] = await Promise.all([
    prisma.productionJour.findMany({ where: { userId }, include: { briques: { include: { brique: true } } }, orderBy: { date: "desc" } }),
    prisma.sortieStock.findMany({ where: { userId }, include: { brique: true }, orderBy: { date: "desc" } }),
    prisma.livraison.findMany({ where: { userId }, include: { commande: { include: { client: true } }, lignes: { include: { brique: true } } }, orderBy: { dateLivraison: "desc" } }),
  ]);

  for (const p of productions) {
    mouvements.push({ id: `prod-${p.id}`, type: "entree", categorie: "production", date: p.date.toISOString(), source: "Production", notes: p.notes, produits: p.briques.map(b => ({ briqueId: b.briqueId, nom: b.brique.nom, dimensions: b.brique.dimensions, quantite: b.quantiteAjoutee || b.nombreSacs, unite: "unités" })) });
  }
  for (const s of sorties) {
    const isEntree = s.type === "retour_ciment";
    mouvements.push({ id: `sortie-${s.id}`, type: isEntree ? "entree" : "sortie", categorie: s.type, date: s.date.toISOString(), source: s.notes || s.type, notes: s.notes, produits: [{ briqueId: s.briqueId, nom: s.brique.nom, dimensions: s.brique.dimensions, quantite: s.quantite, unite: "unités" }] });
  }
  for (const l of livraisons) {
    mouvements.push({ id: `livr-${l.id}`, type: "sortie", categorie: "vente", date: l.dateLivraison.toISOString(), source: l.commande.client.nom, notes: l.notes, produits: l.lignes.map(li => ({ briqueId: li.briqueId, nom: li.brique.nom, dimensions: li.brique.dimensions, quantite: li.quantiteLivree, unite: "unités" })) });
  }

  mouvements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return NextResponse.json(mouvements);
}
