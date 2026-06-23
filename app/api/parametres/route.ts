export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  let parametres = await prisma.parametres.findFirst({ where: { userId } });
  if (!parametres) {
    parametres = await prisma.parametres.create({ data: { userId } });
  }
  return NextResponse.json(parametres);
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const data = await req.json();
  let parametres = await prisma.parametres.findFirst({ where: { userId } });
  if (!parametres) {
    parametres = await prisma.parametres.create({ data: { userId, ...data } });
  } else {
    parametres = await prisma.parametres.update({ where: { id: parametres.id }, data });
  }
  return NextResponse.json(parametres);
}
