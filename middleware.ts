import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PUBLIC = ["/login", "/register", "/api/auth/login", "/api/auth/register", "/abonnement-expire"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("token")?.value;
  const userId = token ? await verifyToken(token) : null;

  if (!userId) return NextResponse.redirect(new URL("/login", req.url));

  // Pas de vérif abonnement pour les routes API admin et la page admin
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  // Vérifier si le compte est actif et l'abonnement valide
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { actif: true, abonnementFin: true, email: true } });

  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  if (isAdmin) return NextResponse.next();

  if (!user.actif) return NextResponse.redirect(new URL("/abonnement-expire", req.url));

  if (user.abonnementFin && new Date() > new Date(user.abonnementFin)) {
    return NextResponse.redirect(new URL("/abonnement-expire", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
