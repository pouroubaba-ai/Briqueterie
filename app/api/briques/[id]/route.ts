import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  const brique = await prisma.brique.update({ where: { id: Number(id) }, data });
  return NextResponse.json(brique);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const briqueId = Number(id);

  // Vérifier si la brique est utilisée avant de tenter la suppression
  const [lignesCommande, lignesLivraison, lignesDevis, productions, sorties] = await Promise.all([
    prisma.ligneCommande.count({ where: { briqueId } }),
    prisma.ligneLivraison.count({ where: { briqueId } }),
    prisma.ligneDevis.count({ where: { briqueId } }),
    prisma.productionJourBrique.count({ where: { briqueId } }),
    prisma.sortieStock.count({ where: { briqueId } }),
  ]);

  const totalUsages = lignesCommande + lignesLivraison + lignesDevis + productions + sorties;

  if (totalUsages > 0) {
    const details: string[] = [];
    if (lignesCommande > 0) details.push(`${lignesCommande} commande(s)`);
    if (lignesLivraison > 0) details.push(`${lignesLivraison} livraison(s)`);
    if (lignesDevis > 0) details.push(`${lignesDevis} devis`);
    if (productions > 0) details.push(`${productions} journée(s) de production`);
    if (sorties > 0) details.push(`${sorties} sortie(s) de stock`);

    return NextResponse.json(
      {
        error: "IN_USE",
        message: `Impossible de supprimer : ce produit est utilisé dans ${details.join(", ")}.`,
      },
      { status: 409 }
    );
  }

  await prisma.brique.delete({ where: { id: briqueId } });
  return NextResponse.json({ ok: true });
}
