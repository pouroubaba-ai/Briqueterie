"use client";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type ParClient = { clientId: number; clientNom: string; qteCommandée: number; qteDispo: number; qteRestante: number; valCommandée: number; valDispo: number; valRestante: number };
type ParProduit = { briqueId: number; nom: string; prixUnit: number; qteCommandée: number; qteDispo: number; qteRestante: number; valCommandée: number; valDispo: number; valRestante: number };
type ProduitRow = { briqueId: number; nom: string; dimensions: string | null; prixUnit: number; qteCommandée: number; qteDispo: number; qteRestante: number; valCommandée: number; valDispo: number; valRestante: number; parClient: ParClient[] };
type ClientRow = { clientId: number; clientNom: string; valCommandée: number; valDispo: number; valRestante: number; parProduit: ParProduit[] };
type Rapport = { global: { valCommandée: number; valDispo: number; valRestante: number }; vueProduits: ProduitRow[]; vueClients: ClientRow[] };

function fmt(n: number, devise: string) {
  return `${devise} ${Math.round(n).toLocaleString("fr-FR")}`;
}

function DetailModal({ title, rows, devise, onClose }: {
  title: string;
  rows: { label: string; qteCommandée: number; qteDispo: number; qteRestante: number; valCommandée: number; valDispo: number; valRestante: number }[];
  devise: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl pb-10 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 text-lg leading-none">&times;</button>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="px-4 py-3 border-b border-gray-50 last:border-0">
            <p className="text-sm font-medium text-gray-800 mb-2">{r.label}</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <p className="text-xs text-blue-600 mb-0.5">Commandé</p>
                <p className="text-sm font-semibold text-blue-800">{r.qteCommandée.toLocaleString("fr-FR")}</p>
                <p className="text-xs text-blue-500">({fmt(r.valCommandée, devise)})</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2 text-center">
                <p className="text-xs text-green-600 mb-0.5">Disponible</p>
                <p className="text-sm font-semibold text-green-800">{r.qteDispo.toLocaleString("fr-FR")}</p>
                <p className="text-xs text-green-500">({fmt(r.valDispo, devise)})</p>
              </div>
              <div className={`rounded-lg p-2 text-center ${r.qteRestante > 0 ? "bg-red-50" : "bg-green-50"}`}>
                <p className={`text-xs mb-0.5 ${r.qteRestante > 0 ? "text-red-600" : "text-green-600"}`}>Restant</p>
                <p className={`text-sm font-semibold ${r.qteRestante > 0 ? "text-red-800" : "text-green-800"}`}>{r.qteRestante.toLocaleString("fr-FR")}</p>
                <p className={`text-xs ${r.qteRestante > 0 ? "text-red-500" : "text-green-500"}`}>({fmt(r.valRestante, devise)})</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RapportCommandes() {
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [devise, setDevise] = useState("FCFA");
  const [vue, setVue] = useState<"produit" | "client">("produit");
  const [modal, setModal] = useState<{ title: string; rows: { label: string; qteCommandée: number; qteDispo: number; qteRestante: number; valCommandée: number; valDispo: number; valRestante: number }[] } | null>(null);

  useEffect(() => {
    fetch("/api/commandes/rapport").then(r => r.json()).then(setRapport);
    fetch("/api/parametres").then(r => r.json()).then(p => { if (p.devise) setDevise(p.devise); });
  }, []);

  if (!rapport) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  function openProduitModal(p: ProduitRow) {
    setModal({
      title: `${p.nom}${p.dimensions ? ` — ${p.dimensions}` : ""} — par client`,
      rows: p.parClient.map(c => ({ label: c.clientNom, qteCommandée: c.qteCommandée, qteDispo: c.qteDispo, qteRestante: c.qteRestante, valCommandée: c.valCommandée, valDispo: c.valDispo, valRestante: c.valRestante })),
    });
  }

  function openClientModal(c: ClientRow) {
    setModal({
      title: `${c.clientNom} — par produit`,
      rows: c.parProduit.map(p => ({ label: p.nom, qteCommandée: p.qteCommandée, qteDispo: p.qteDispo, qteRestante: p.qteRestante, valCommandée: p.valCommandée, valDispo: p.valDispo, valRestante: p.valRestante })),
    });
  }

  const g = rapport.global;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header sans burger */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <Link href="/commandes"><ArrowLeft size={20} className="text-gray-500" /></Link>
        <div>
          <h1 className="text-base font-semibold text-gray-900">Rapport commandes</h1>
          <p className="text-xs text-gray-500">Commandes actives · stock disponible</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Récap global */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">Commandé</p>
            <p className="text-sm font-bold text-blue-800">{fmt(g.valCommandée, devise)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xs text-green-600 mb-1">Disponible</p>
            <p className="text-sm font-bold text-green-800">{fmt(g.valDispo, devise)}</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${g.valRestante > 0 ? "bg-red-50" : "bg-green-50"}`}>
            <p className={`text-xs mb-1 ${g.valRestante > 0 ? "text-red-600" : "text-green-600"}`}>Restant</p>
            <p className={`text-sm font-bold ${g.valRestante > 0 ? "text-red-800" : "text-green-800"}`}>{fmt(g.valRestante, devise)}</p>
          </div>
        </div>

        {/* Toggle vue */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setVue("produit")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${vue === "produit" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
            Vue produit
          </button>
          <button onClick={() => setVue("client")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${vue === "client" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
            Vue client
          </button>
        </div>

        {/* Vue Produit */}
        {vue === "produit" && (
          <div className="space-y-3">
            {rapport.vueProduits.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">Aucune commande active</p>
            )}
            {rapport.vueProduits.map(p => (
              <div key={p.briqueId} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 pt-4 pb-3 flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    <button
                      onClick={() => openProduitModal(p)}
                      className="mt-0.5 w-6 h-6 rounded-full border-2 border-amber-400 bg-amber-50 flex items-center justify-center text-amber-700 text-xs font-bold flex-shrink-0"
                    >!</button>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.nom}{p.dimensions ? ` — ${p.dimensions}` : ""}</p>
                      <p className="text-xs text-gray-400">{devise} {p.prixUnit.toLocaleString("fr-FR")} / unité</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-blue-500 mb-0.5">Commandé</p>
                    <p className="text-sm font-bold text-blue-800">{p.qteCommandée.toLocaleString("fr-FR")}</p>
                    <p className="text-xs text-blue-400">({fmt(p.valCommandée, devise)})</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-green-500 mb-0.5">Disponible</p>
                    <p className="text-sm font-bold text-green-800">{p.qteDispo.toLocaleString("fr-FR")}</p>
                    <p className="text-xs text-green-400">({fmt(p.valDispo, devise)})</p>
                  </div>
                  <div className={`rounded-lg p-2 text-center ${p.qteRestante > 0 ? "bg-red-50" : "bg-green-50"}`}>
                    <p className={`text-xs mb-0.5 ${p.qteRestante > 0 ? "text-red-500" : "text-green-500"}`}>Restant</p>
                    <p className={`text-sm font-bold ${p.qteRestante > 0 ? "text-red-800" : "text-green-800"}`}>{p.qteRestante.toLocaleString("fr-FR")}</p>
                    <p className={`text-xs ${p.qteRestante > 0 ? "text-red-400" : "text-green-400"}`}>({fmt(p.valRestante, devise)})</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vue Client */}
        {vue === "client" && (
          <div className="space-y-3">
            {rapport.vueClients.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">Aucune commande active</p>
            )}
            {rapport.vueClients.map(c => (
              <div key={c.clientId} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 pt-4 pb-3 flex items-center gap-2">
                  <button
                    onClick={() => openClientModal(c)}
                    className="w-6 h-6 rounded-full border-2 border-amber-400 bg-amber-50 flex items-center justify-center text-amber-700 text-xs font-bold flex-shrink-0"
                  >!</button>
                  <p className="text-sm font-semibold text-gray-900">{c.clientNom}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-blue-500 mb-0.5">Commandé</p>
                    <p className="text-sm font-bold text-blue-800">{fmt(c.valCommandée, devise)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-green-500 mb-0.5">Disponible</p>
                    <p className="text-sm font-bold text-green-800">{fmt(c.valDispo, devise)}</p>
                  </div>
                  <div className={`rounded-lg p-2 text-center ${c.valRestante > 0 ? "bg-red-50" : "bg-green-50"}`}>
                    <p className={`text-xs mb-0.5 ${c.valRestante > 0 ? "text-red-500" : "text-green-500"}`}>Restant</p>
                    <p className={`text-sm font-bold ${c.valRestante > 0 ? "text-red-800" : "text-green-800"}`}>{fmt(c.valRestante, devise)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && <DetailModal title={modal.title} rows={modal.rows} devise={devise} onClose={() => setModal(null)} />}
    </div>
  );
}
