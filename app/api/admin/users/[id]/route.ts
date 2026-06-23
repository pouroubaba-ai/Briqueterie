export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

async function checkAdmin(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return null;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me || !isAdmin(me.email)) return null;
  return me;
}

// PATCH : modifier actif, abonnementDebut, abonnementFin
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const targetId = Number(id);
  if (targetId === admin.id) return NextResponse.json({ error: "Impossible de modifier votre propre compte" }, { status: 400 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.actif === "boolean") data.actif = body.actif;
  if (body.abonnementDebut !== undefined) data.abonnementDebut = body.abonnementDebut ? new Date(body.abonnementDebut) : null;
  if (body.abonnementFin !== undefined) data.abonnementFin = body.abonnementFin ? new Date(body.abonnementFin) : null;

  const updated = await prisma.user.update({ where: { id: targetId }, data, select: { id: true, email: true, nom: true, actif: true, abonnementDebut: true, abonnementFin: true, createdAt: true } });
  return NextResponse.json(updated);
}

// DELETE : supprimer le compte et toutes ses données
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const targetId = Number(id);
  if (targetId === admin.id) return NextResponse.json({ error: "Impossible de supprimer votre propre compte" }, { status: 400 });

  await prisma.user.delete({ where: { id: targetId } });
  return NextResponse.json({ ok: true });
}
