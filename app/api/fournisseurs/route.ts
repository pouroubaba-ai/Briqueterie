export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const fournisseurs = await prisma.fournisseur.findMany({
    include: {
      achats: true,
      versements: true,
    },
    orderBy: { nom: "asc" },
  });

  const result = fournisseurs.map(f => {
    const totalAchats = f.achats.reduce((s, a) => s + a.montantTotal, 0);
    const totalVerse = f.achats.reduce((s, a) => s + a.montantVerse, 0);
    const totalDu = totalAchats - totalVerse;
    return { ...f, totalAchats, totalVerse, totalDu };
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  try {
    const { nom, telephone, adresse, notes } = await req.json();
    if (!nom?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

    const f = await prisma.fournisseur.create({
      data: { nom: nom.trim(), telephone: telephone ?? "", adresse: adresse ?? "", notes: notes ?? "" },
    });
    return NextResponse.json(f, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
