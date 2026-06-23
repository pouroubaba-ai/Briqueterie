"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
const DepensesTab = dynamic(() => import("../_depenses"), { ssr: false });

export default function Page() {
  const [devise, setDevise] = useState("FCFA");
  useEffect(() => {
    fetch("/api/parametres").then(r => r.json()).then(p => { if (p.devise) setDevise(p.devise); });
  }, []);
  return <DepensesTab devise={devise} />;
}
