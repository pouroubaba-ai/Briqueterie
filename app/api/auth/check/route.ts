export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ blocked: false });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { actif: true, abonnementFin: true, email: true },
  });

  if (!user) return NextResponse.json({ blocked: false });

  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  if (isAdmin) return NextResponse.json({ blocked: false });

  if (!user.actif) return NextResponse.json({ blocked: true });

  if (user.abonnementFin && new Date() > new Date(user.abonnementFin)) {
    return NextResponse.json({ blocked: true });
  }

  return NextResponse.json({ blocked: false });
}
