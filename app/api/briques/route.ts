import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const briques = await prisma.brique.findMany({ orderBy: { nom: "asc" } });
  return NextResponse.json(briques);
}

export async function POST(req: Request) {
  const data = await req.json();
  const brique = await prisma.brique.create({ data });
  return NextResponse.json(brique, { status: 201 });
}
