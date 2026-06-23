"use client";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";

type DashData = {
  recettes: number; impayesMois: number; depenses: number; beneficeNet: number;
  depensesProduction: number; depensesFournisseurs: number; depensesDiverses: number;
  totalPertes: number; resteAVerser: number; totalStockValeur: number;
  facturesRecentes: { id: number; numero: string; statut: string; totalFacture: number; totalPaye: number; resteAPayer: number; livraison: { commande: { client: { nom: string } } } }[];
  sortiesMois: { id: number; type: string; quantite: number; valeur: number; brique: { nom: string }; date: string }[];
  productionsMois: { montantDu: number; montantVerse: number }[];
};
type FournisseurSummary = { totalAchats: number; totalVerse: number; totalDu: number };

function fmt(n: number, d: string) { return `${d} ${Math.round(n).toLocaleString("fr-FR")}`; }

const typeLabels: Record<string, string> = { vol: "Vol", casse: "Casse", perte: "Perte", autre: "Autre" };
const typeCouleurs: Record<string, string> = { vol: "bg-red-100 text-red-800", casse: "bg-yellow-100 text-yellow-800", perte: "bg-blue-100 text-blue-800", autre: "bg-gray-100 text-gray-600" };

type Periode = "jour" | "semaine" | "mois" | "annee" | "custom";

function getRange(periode: Periode, customDe: string, customA: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (periode === "jour") { const t = fmt(now); return { de: t, a: t }; }
  if (periode === "semaine") {
    const day = now.getDay() || 7; const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { de: fmt(mon), a: fmt(sun) };
  }
  if (periode === "mois") {
    return { de: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), a: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
  }
  if (periode === "annee") return { de: `${now.getFullYear()}-01-01`, a: `${now.getFullYear()}-12-31` };
  return { de: customDe, a: customA };
}

export default function SyntheseTab({ devise }: { devise: string }) {
  const [data, setData] = useState<DashData | null>(null);
  const [fournisseurs, setFournisseurs] = useState<FournisseurSummary>({ totalAchats: 0, totalVerse: 0, totalDu: 0 });
  const [periode, setPeriode] = useState<Periode>("mois");
  const [customDe, setCustomDe] = useState(new Date().toISOString().slice(0, 10));
  const [customA, setCustomA] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const { de, a } = getRange(periode, customDe, customA);
    fetch(`/api/dashboard?de=${de}&a=${a}`).then(r => r.json()).then(setData);
    fetch("/api/fournisseurs").then(r => r.json()).then((liste: FournisseurSummary[]) => {
      setFournisseurs({ totalAchats: liste.reduce((s, f) => s + f.totalAchats, 0), totalVerse: liste.reduce((s, f) => s + f.totalVerse, 0), totalDu: liste.reduce((s, f) => s + f.totalDu, 0) });
    });
  }, [periode, customDe, customA]);

  if (!data) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>;

  const totalSorties = data.sortiesMois.reduce((s, st) => s + st.valeur, 0);
  const prodDu = data.productionsMois.reduce((s, p) => s + p.montantDu, 0);
  const prodVerse = data.productionsMois.reduce((s, p) => s + p.montantVerse, 0);

  return (
    <div className="pb-4">
      <div className="bg-white border-b border-gray-100 px-4 pt-3 pb-3 space-y-2">
        <select
          value={periode}
          onChange={e => setPeriode(e.target.value as typeof periode)}
          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:border-green-500"
        >
          <option value="jour">Aujourd'hui</option>
          <option value="semaine">Cette semaine</option>
          <option value="mois">Ce mois</option>
          <option value="annee">Cette année</option>
          <option value="custom">Personnalisé</option>
        </select>
        {periode === "custom" && (
          <div className="flex gap-2">
            <input type="date" value={customDe} onChange={e => setCustomDe(e.target.value)} className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
            <span className="text-xs text-gray-400 self-center">→</span>
            <input type="date" value={customA} onChange={e => setCustomA(e.target.value)} className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Recettes encaissées", value: data.recettes, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
            { label: "Impayés clients", value: data.impayesMois, icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" },
            { label: "Total dépenses", value: data.depenses, icon: Wallet, color: "text-red-500", bg: "bg-red-50" },
            { label: "Bénéfice net", value: data.beneficeNet, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl p-3 border border-gray-100">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}><Icon size={16} className={color} /></div>
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-sm font-bold text-gray-900">{fmt(value, devise)}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Bilan production & paie</p>
          {[{ label: "Total dû aux ouvriers", value: prodDu, color: "text-gray-900" }, { label: "Déjà versé", value: prodVerse, color: "text-green-600" }, { label: "Reste à verser", value: prodDu - prodVerse, color: "text-red-600" }].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-500">{label}</span>
              <span className={`text-sm font-semibold ${color}`}>{fmt(value, devise)}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Bilan fournisseurs</p>
          {[{ label: "Total achats fournisseurs", value: fournisseurs.totalAchats, color: "text-gray-900" }, { label: "Déjà versé", value: fournisseurs.totalVerse, color: "text-green-600" }, { label: "Reste à payer", value: fournisseurs.totalDu, color: fournisseurs.totalDu > 0 ? "text-red-600" : "text-gray-400" }].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-500">{label}</span>
              <span className={`text-sm font-semibold ${color}`}>{fmt(value, devise)}</span>
            </div>
          ))}
        </div>

        {data.depensesDiverses > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dépenses diverses</p>
            {[{ label: "Dépenses de production", value: data.depensesProduction, color: "text-gray-900" }, { label: "Paiements fournisseurs", value: data.depensesFournisseurs, color: "text-gray-900" }, { label: "Autres dépenses", value: data.depensesDiverses, color: "text-red-600" }, { label: "Total dépenses du mois", value: data.depenses, color: "text-red-700" }].map(({ label, value, color }) => (
              <div key={label} className={`flex items-center justify-between py-2 border-b border-gray-50 last:border-0 ${label.startsWith("Total") ? "mt-1 pt-3 border-t border-gray-200 border-b-0" : ""}`}>
                <span className={`text-xs ${label.startsWith("Total") ? "font-semibold text-gray-700" : "text-gray-500"}`}>{label}</span>
                <span className={`text-sm font-semibold ${color}`}>{fmt(value, devise)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="bg-green-50 rounded-xl border border-green-100 p-4 flex items-center justify-between">
          <div><p className="text-xs text-green-700 font-medium">Valeur totale du stock</p><p className="text-xs text-green-600 mt-0.5">Capital immobilisé</p></div>
          <p className="text-base font-bold text-green-700">{fmt(data.totalStockValeur, devise)}</p>
        </div>

        {data.sortiesMois.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3"><AlertTriangle size={14} className="text-red-500" /><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pertes hors ventes</p></div>
            {data.sortiesMois.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeCouleurs[s.type] ?? "bg-gray-100 text-gray-600"}`}>{typeLabels[s.type] ?? s.type}</span>
                  <span className="text-xs text-gray-500">{s.quantite} × {s.brique.nom}</span>
                </div>
                <span className="text-xs font-semibold text-red-600">− {fmt(s.valeur, devise)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 mt-1 border-t border-gray-100">
              <span className="text-xs font-medium text-gray-500">Total pertes</span>
              <span className="text-sm font-bold text-red-600">− {fmt(totalSorties, devise)}</span>
            </div>
          </div>
        )}

        {data.facturesRecentes.filter(f => f.statut !== "payee").length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Factures à encaisser</p>
            {data.facturesRecentes.filter(f => f.statut !== "payee").map(f => (
              <div key={f.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div><p className="text-xs font-medium text-gray-700">{f.livraison.commande.client.nom}</p><p className="text-xs text-gray-400">{f.numero}</p></div>
                <span className="text-sm font-bold text-red-600">{fmt(f.resteAPayer, devise)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 mt-1 border-t border-gray-100">
              <span className="text-xs font-medium text-gray-500">Total impayé</span>
              <span className="text-sm font-bold text-red-600">{fmt(data.impayesMois, devise)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
