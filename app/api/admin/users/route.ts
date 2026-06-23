export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me || !isAdmin(me.email)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, nom: true, actif: true, abonnementDebut: true, abonnementFin: true, createdAt: true },
  });
  return NextResponse.json(users);
}
