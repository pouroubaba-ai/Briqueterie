export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });

  const token = await signToken(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", token, { httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: "/" });
  return res;
}
