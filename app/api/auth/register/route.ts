export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password, nom } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, password: hash, nom: nom ?? "" } });

  const token = await signToken(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", token, { httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: "/" });
  return res;
}
