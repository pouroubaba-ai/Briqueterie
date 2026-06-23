export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const devis = await prisma.devis.findMany({
    include: { client: true, lignes: { include: { brique: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(devis);
}

export async function POST(req: Request) {
  const { clientId, dateValidite, transport, notes, lignes } = await req.json();
  const count = await prisma.devis.count();
  const numero = `DEV-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

  const devis = await prisma.devis.create({
    data: {
      numero,
      clientId,
      dateValidite: new Date(dateValidite),
      transport: transport ?? 0,
      notes: notes ?? "",
      lignes: { create: lignes },
    },
    include: { client: true, lignes: { include: { brique: true } } },
  });
  return NextResponse.json(devis, { status: 201 });
}
