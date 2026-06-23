export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const briques = await prisma.brique.findMany({ where: { userId }, orderBy: { nom: "asc" } });
  return NextResponse.json(briques);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const data = await req.json();
  const brique = await prisma.brique.create({ data: { ...data, userId } });
  return NextResponse.json(brique, { status: 201 });
}
