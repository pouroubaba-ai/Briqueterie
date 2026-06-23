export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const devis = await prisma.devis.findUnique({
    where: { id: Number(id) },
    include: { client: true, lignes: { include: { brique: true } } },
  });
  if (!devis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(devis);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { statut } = await req.json();
  const devis = await prisma.devis.update({
    where: { id: Number(id) },
    data: { statut },
    include: { client: true, lignes: { include: { brique: true } } },
  });
  return NextResponse.json(devis);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.devis.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
