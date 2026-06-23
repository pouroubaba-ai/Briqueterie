export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const commande = await prisma.commande.findUnique({
    where: { id: Number(id) },
    include: { client: true, lignes: { include: { brique: true } }, livraison: true, devis: { include: { lignes: { include: { brique: true } } } } },
  });
  if (!commande) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(commande);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { statut } = await req.json();
  const commande = await prisma.commande.update({
    where: { id: Number(id) },
    data: { statut },
    include: { client: true, lignes: { include: { brique: true } } },
  });
  return NextResponse.json(commande);
}
