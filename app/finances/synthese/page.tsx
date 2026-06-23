export const dynamic = "force-dynamic";
"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
const SyntheseTab = dynamic(() => import("../_synthese"), { ssr: false });

export default function Page() {
  const [devise, setDevise] = useState("FCFA");
  useEffect(() => {
    fetch("/api/parametres").then(r => r.json()).then(p => { if (p.devise) setDevise(p.devise); });
  }, []);
  return <SyntheseTab devise={devise} />;
}
