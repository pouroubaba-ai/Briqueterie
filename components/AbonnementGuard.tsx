"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const SKIP = ["/login", "/register", "/abonnement-expire"];

export default function AbonnementGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (SKIP.some(p => pathname.startsWith(p))) return;
    fetch("/api/auth/check").then(r => r.json()).then(d => {
      if (d.blocked) router.replace("/abonnement-expire");
    }).catch(() => {});
  }, [pathname]);

  return null;
}
