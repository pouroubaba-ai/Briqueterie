export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const fournisseurs = await prisma.fournisseur.findMany({
    where: { userId },
    include: { achats: true, versements: true },
    orderBy: { nom: "asc" },
  });
  const result = fournisseurs.map(f => {
    const totalAchats = f.achats.reduce((s, a) => s + a.montantTotal, 0);
    const totalVerse = f.achats.reduce((s, a) => s + a.montantVerse, 0);
    return { ...f, totalAchats, totalVerse, totalDu: totalAchats - totalVerse };
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const { nom, telephone, adresse, notes } = await req.json();
    if (!nom?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    const f = await prisma.fournisseur.create({
      data: { userId, nom: nom.trim(), telephone: telephone ?? "", adresse: adresse ?? "", notes: notes ?? "" },
    });
    return NextResponse.json(f, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
