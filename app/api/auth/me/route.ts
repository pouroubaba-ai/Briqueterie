export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json(null);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, nom: true } });
  if (!user) return NextResponse.json(null);
  return NextResponse.json({ ...user, isAdmin: user.email === process.env.ADMIN_EMAIL });
}
