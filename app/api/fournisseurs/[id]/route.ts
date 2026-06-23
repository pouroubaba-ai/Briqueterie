export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await prisma.fournisseur.findUnique({
    where: { id: Number(id) },
    include: {
      achats: { include: { lignes: { include: { brique: true } } }, orderBy: { date: "asc" } },
      versements: { orderBy: { date: "desc" } },
    },
  });
  if (!f) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const totalAchats = f.achats.reduce((s, a) => s + a.montantTotal, 0);
  const totalVerse = f.achats.reduce((s, a) => s + a.montantVerse, 0);

  return NextResponse.json({ ...f, totalAchats, totalVerse, totalDu: totalAchats - totalVerse });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { nom, telephone, adresse, notes } = await req.json();
  const f = await prisma.fournisseur.update({
    where: { id: Number(id) },
    data: { nom, telephone, adresse, notes },
  });
  return NextResponse.json(f);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.fournisseur.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
