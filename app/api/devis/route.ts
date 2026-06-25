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
  const { clientId, dateValidite, notes, lignes } = await req.json();
  const count = await prisma.devis.count({ where: { userId } });
  const numero = `DEV-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;
  // Transport total calculé depuis les lignes (transportUnit × quantite)
  const transportTotal = (lignes as { quantite: number; transportUnit?: number }[]).reduce((s, l) => s + l.quantite * (l.transportUnit ?? 0), 0);

  const devis = await prisma.devis.create({
    data: {
      userId, numero, clientId,
      dateValidite: new Date(dateValidite),
      transport: transportTotal,
      notes: notes ?? "",
      lignes: { create: lignes.map((l: { briqueId: number; quantite: number; prixUnit: number; transportUnit?: number }) => ({ briqueId: l.briqueId, quantite: l.quantite, prixUnit: l.prixUnit, transportUnit: l.transportUnit ?? 0 })) },
    },
    include: { client: true, lignes: { include: { brique: true } } },
  });
  return NextResponse.json(devis, { status: 201 });
}
