export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const devis = await prisma.devis.findMany({
    where: { userId },
    include: { client: true, lignes: { include: { brique: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(devis);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { clientId, dateValidite, transport, notes, lignes } = await req.json();
  const count = await prisma.devis.count({ where: { userId } });
  const numero = `DEV-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

  const devis = await prisma.devis.create({
    data: {
      userId, numero, clientId,
      dateValidite: new Date(dateValidite),
      transport: transport ?? 0,
      notes: notes ?? "",
      lignes: { create: lignes },
    },
    include: { client: true, lignes: { include: { brique: true } } },
  });
  return NextResponse.json(devis, { status: 201 });
}
