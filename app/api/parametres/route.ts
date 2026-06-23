import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let parametres = await prisma.parametres.findUnique({ where: { id: 1 } });
  if (!parametres) {
    parametres = await prisma.parametres.create({ data: { id: 1 } });
  }
  return NextResponse.json(parametres);
}

export async function PUT(req: Request) {
  const data = await req.json();
  const parametres = await prisma.parametres.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  return NextResponse.json(parametres);
}
