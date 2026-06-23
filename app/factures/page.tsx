"use client";
import { useEffect, useState } from "react";
import { Receipt, ChevronRight, XCircle } from "lucide-react";
import Link from "next/link";

type Facture = {
  id: number; numero: string; statut: string; createdAt: string; transport: number;
  livraison: { commande: { client: { nom: string } }; lignes: { quantiteLivree: number; brique: { prixVente: number } }[] };
  paiements: { montant: number }[];
};

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = { payee: "bg-green-100 text-green-800", partielle: "bg-yellow-100 text-yellow-800", impayee: "bg-red-100 text-red-800", annulee: "bg-gray-100 text-gray-500" };
  const labels: Record<string, string> = { payee: "Payé", partielle: "Partiel", impayee: "Impayé", annulee: "Annulée" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[statut] ?? "bg-gray-100 text-gray-600"}`}>{labels[statut] ?? statut}</span>;
}

export default function Factures() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [devise, setDevise] = useState("FCFA");
  const [filtre, setFiltre] = useState("toutes");
  const [confirmAnnule, setConfirmAnnule] = useState<Facture | null>(null);
  const [annulErreur, setAnnulErreur] = useState<string | null>(null);

  function load() {
    fetch("/api/factures").then(r => r.json()).then(setFactures);
    fetch("/api/parametres").then(r => r.json()).then(p => { if (p.devise) setDevise(p.devise); });
  }
  useEffect(load, []);

  async function annulerFacture() {
    if (!confirmAnnule) return;
    setAnnulErreur(null);
    const res = await fetch(`/api/factures/${confirmAnnule.id}/annuler`, { method: "POST" });
    if (!res.ok) { const e = await res.json(); setAnnulErreur(e.error); return; }
    setConfirmAnnule(null);
    load();
  }

  const filtrees = factures.filter(f => filtre === "toutes" ? f.statut !== "annulee" : f.statut === filtre);

  return (
    <div className="pb-4">
      <div className="bg-white border-b border-gray-200 px-4 py-4 z-10">
        <h1 className="text-base font-semibold text-gray-900">Factures</h1>
        <div className="flex gap-2 mt-2 overflow-x-auto">
          {[
            { value: "toutes", label: "Toutes" },
            { value: "impayee", label: "Impayées" },
            { value: "partielle", label: "Partielles" },
            { value: "payee", label: "Payées" },
          { value: "annulee", label: "Annulées" },
          ].map(({ value, label }) => (
            <button key={value} onClick={() => setFiltre(value)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filtre === value ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filtrees.length === 0 && (
          <div className="text-center py-12">
            <Receipt size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucune facture</p>
          </div>
        )}
        {filtrees.map(f => {
          const total = f.livraison.lignes.reduce((s, l) => s + l.quantiteLivree * l.brique.prixVente, 0) + f.transport;
          const paye = f.paiements.reduce((s, p) => s + p.montant, 0);
          const reste = total - paye;
          return (
            <div key={f.id} className={`bg-white rounded-xl border p-4 ${f.statut === "annulee" ? "border-gray-100 opacity-60" : "border-gray-100"}`}>
              <Link href={`/factures/${f.id}`} className="block">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{f.livraison.commande.client.nom}</p>
                    <p className="text-xs text-gray-400">{f.numero} · {new Date(f.createdAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatutBadge statut={f.statut} />
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-400">Total</p>
                    <p className="text-xs font-semibold text-gray-900">{devise} {total.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <p className="text-xs text-gray-400">Payé</p>
                    <p className="text-xs font-semibold text-green-700">{devise} {paye.toLocaleString()}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2">
                    <p className="text-xs text-gray-400">Reste</p>
                    <p className="text-xs font-semibold text-red-600">{devise} {reste.toLocaleString()}</p>
                  </div>
                </div>
                <div className="w-full h-1 bg-gray-100 rounded mt-2">
                  <div className="h-1 bg-green-500 rounded" style={{ width: `${total > 0 ? Math.min((paye / total) * 100, 100) : 0}%` }} />
                </div>
              </Link>
              {f.statut !== "annulee" && (
                <button onClick={() => { setAnnulErreur(null); setConfirmAnnule(f); }}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-medium">
                  <XCircle size={13} /> Annuler la vente
                </button>
              )}
            </div>
          );
        })}

        {confirmAnnule && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl p-6 pb-10">
              <p className="text-base font-semibold text-gray-900 mb-1">Annuler cette vente ?</p>
              <p className="text-sm text-gray-500 mb-1">{confirmAnnule.numero} — le stock sera restauré.</p>
              {annulErreur && <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2 mt-2">{annulErreur}</p>}
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setConfirmAnnule(null); setAnnulErreur(null); }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700">
                  Retour
                </button>
                <button onClick={annulerFacture} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-medium">
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
