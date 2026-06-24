"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Building2, Users, ChevronDown, ChevronUp, Factory } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";

type HistPoint = { label: string; ca: number; depenses: number };
type DonutSlice = { name: string; value: number; color: string };
type TopClient = { id: number; nom: string; total: number };
type TopFourn  = { id: number; nom: string; total: number };
type ProdBrique = { nombreSacs: number; quantiteAjoutee: number; prixParSac: number; brique: { nom: string; prixVente: number } };
type Production = { id: number; date: string; totalSacs: number; montantDu: number; montantVerse: number; briques: ProdBrique[] };
type DashData = {
  recettes: number; totalPaye: number; impayesMois: number; depenses: number; beneficeNet: number;
  resteAVerser: number; resteDuFournisseurs: number; totalPertes: number; totalStockValeur: number;
  depensesProduction: number; depensesFournisseurs: number; depensesDiverses: number;
  productionsMois: Production[];
  historique: HistPoint[];
  repartitionDepenses: DonutSlice[];
  top5Clients: TopClient[];
  top5Fournisseurs: TopFourn[];
};

type Periode = "jour" | "mois" | "annee" | "custom";

function fmt(n: number, d: string) { return `${d} ${Math.round(n).toLocaleString("fr-FR")}`; }
function fmtShort(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return String(Math.round(n));
}

function getRange(periode: Periode, customDe: string, customA: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (periode === "jour") {
    const t = fmt(now);
    return { de: t, a: t };
  }
  if (periode === "mois") {
    const de = new Date(now.getFullYear(), now.getMonth(), 1);
    const a  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { de: fmt(de), a: fmt(a) };
  }
  if (periode === "annee") {
    return { de: `${now.getFullYear()}-01-01`, a: `${now.getFullYear()}-12-31` };
  }
  return { de: customDe, a: customA };
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashData | null>(null);
  const [devise, setDevise] = useState("FCFA");
  const [periode, setPeriode] = useState<Periode>("mois");
  const [customDe, setCustomDe] = useState(new Date().toISOString().slice(0, 10));
  const [customA,  setCustomA]  = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [productionExpanded, setProductionExpanded] = useState(false);
  const [popup, setPopup] = useState<"ca" | "depenses" | "benefice-reel" | "benefice-theorique" | null>(null);

  useEffect(() => {
    fetch("/api/parametres").then(r => r.json()).then(p => { if (p.devise) setDevise(p.devise); });
  }, []);

  useEffect(() => {
    const { de, a } = getRange(periode, customDe, customA);
    if (!de || !a) return;
    setLoading(true);
    fetch(`/api/dashboard?de=${de}&a=${a}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [periode, customDe, customA]);

  const totalDonut = data?.repartitionDepenses.reduce((s, r) => s + r.value, 0) ?? 0;

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3">
        <h1 className="text-base font-semibold text-gray-900 mb-3">Tableau de bord</h1>

        {/* Toggles période */}
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: "jour",   label: "Aujourd'hui" },
            { key: "mois",   label: "Ce mois" },
            { key: "annee",  label: "Cette année" },
            { key: "custom", label: "Personnalisé" },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setPeriode(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${periode === key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200"}`}>
              {label}
            </button>
          ))}
        </div>

        {periode === "custom" && (
          <div className="flex gap-2 mt-3">
            <input type="date" value={customDe} onChange={e => setCustomDe(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-green-500" />
            <span className="text-xs text-gray-400 self-center">→</span>
            <input type="date" value={customA} onChange={e => setCustomA(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-green-500" />
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && data && (
        <div className="p-4 space-y-4">
          {/* 4 cases principales */}
          {(() => {
            const totalDettes = data.resteAVerser + data.resteDuFournisseurs;
            const beneficeReel = data.totalPaye - data.depenses;
            const beneficeTheorique = data.recettes - data.depenses - totalDettes;
            return (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {/* Case 1 — CA */}
                  <div className="bg-white rounded-xl p-3 border border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Chiffre d&apos;affaires</p>
                    <p className="text-sm font-bold text-gray-900">{fmt(data.recettes, devise)}</p>
                    <div className="mt-2 pt-2 border-t border-gray-50">
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-gray-400">Encaissé</p>
                        <button onClick={() => setPopup("ca")}
                          className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 text-xs flex items-center justify-center flex-shrink-0 italic font-medium leading-none">!</button>
                      </div>
                      <p className="text-sm font-bold text-green-600">{fmt(data.totalPaye, devise)}</p>
                    </div>
                  </div>

                  {/* Case 2 — Dépenses */}
                  <div className="bg-white rounded-xl p-3 border border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Dépenses</p>
                    <p className="text-sm font-bold text-gray-900">{fmt(data.depenses, devise)}</p>
                    <div className="mt-2 pt-2 border-t border-gray-50">
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-gray-400">À venir</p>
                        <button onClick={() => setPopup("depenses")}
                          className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 text-xs flex items-center justify-center flex-shrink-0 italic font-medium leading-none">!</button>
                      </div>
                      <p className="text-sm font-bold text-orange-500">{fmt(totalDettes, devise)}</p>
                    </div>
                  </div>

                  {/* Case 3 — Stock */}
                  <div className="bg-white rounded-xl p-3 border border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Stock</p>
                    <p className="text-sm font-bold text-gray-900">{fmt(data.totalStockValeur, devise)}</p>
                    <div className="mt-2 pt-2 border-t border-gray-50">
                      <p className="text-xs text-gray-400">Pertes</p>
                      <p className="text-sm font-bold text-red-500">{fmt(data.totalPertes, devise)}</p>
                    </div>
                  </div>

                  {/* Case 4 — Bénéfice */}
                  <div className="bg-white rounded-xl p-3 border border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Bénéfice</p>
                    <div className="flex items-center gap-1">
                      <p className={`text-sm font-bold ${beneficeReel >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(beneficeReel, devise)}</p>
                      <button onClick={() => setPopup("benefice-reel")}
                        className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 text-xs flex items-center justify-center flex-shrink-0 italic font-medium leading-none">!</button>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-50">
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-gray-400">Théorique</p>
                        <button onClick={() => setPopup("benefice-theorique")}
                          className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 text-xs flex items-center justify-center flex-shrink-0 italic font-medium leading-none">!</button>
                      </div>
                      <p className={`text-sm font-bold ${beneficeTheorique >= 0 ? "text-gray-600" : "text-red-500"}`}>{fmt(beneficeTheorique, devise)}</p>
                    </div>
                  </div>
                </div>

                {/* Popups */}
                {popup && (
                  <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setPopup(null)}>
                    <div className="bg-white w-full rounded-t-2xl p-5 pb-10" onClick={e => e.stopPropagation()}>
                      {popup === "ca" && (
                        <>
                          <p className="text-sm font-semibold text-gray-900 mb-1">Chiffre d&apos;affaires</p>
                          <p className="text-xs text-gray-400 mb-4">Détail des ventes sur la période</p>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Total facturé</span><span className="font-semibold text-gray-900">{fmt(data.recettes, devise)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Encaissé</span><span className="font-semibold text-green-600">{fmt(data.totalPaye, devise)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Reste à encaisser</span><span className="font-semibold text-orange-500">{fmt(data.impayesMois, devise)}</span></div>
                          </div>
                        </>
                      )}
                      {popup === "depenses" && (
                        <>
                          <p className="text-sm font-semibold text-gray-900 mb-1">Dépenses à venir</p>
                          <p className="text-xs text-gray-400 mb-4">Montants dus, non encore payés</p>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Dettes production</span><span className="font-semibold text-orange-500">{fmt(data.resteAVerser, devise)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Dettes fournisseurs</span><span className="font-semibold text-orange-500">{fmt(data.resteDuFournisseurs, devise)}</span></div>
                            <div className="flex justify-between text-sm pt-3 border-t border-gray-100"><span className="font-semibold text-gray-900">Total à venir</span><span className="font-bold text-orange-500">{fmt(totalDettes, devise)}</span></div>
                          </div>
                        </>
                      )}
                      {popup === "benefice-reel" && (
                        <>
                          <p className="text-sm font-semibold text-gray-900 mb-1">Bénéfice réel</p>
                          <p className="text-xs text-gray-400 mb-4">Ce que tu as vraiment en poche</p>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Encaissé</span><span className="font-semibold text-green-600">+ {fmt(data.totalPaye, devise)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Dépenses payées</span><span className="font-semibold text-red-500">− {fmt(data.depenses, devise)}</span></div>
                            <div className="flex justify-between text-sm pt-3 border-t border-gray-100"><span className="font-semibold text-gray-900">Bénéfice réel</span><span className={`font-bold ${beneficeReel >= 0 ? "text-green-600" : "text-red-500"}`}>= {fmt(beneficeReel, devise)}</span></div>
                          </div>
                        </>
                      )}
                      {popup === "benefice-theorique" && (
                        <>
                          <p className="text-sm font-semibold text-gray-900 mb-1">Bénéfice théorique</p>
                          <p className="text-xs text-gray-400 mb-4">Si tous les clients payaient et toutes les dettes réglées</p>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Chiffre d&apos;affaires</span><span className="font-semibold text-green-600">+ {fmt(data.recettes, devise)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Dépenses payées</span><span className="font-semibold text-red-500">− {fmt(data.depenses, devise)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Dettes restantes</span><span className="font-semibold text-red-500">− {fmt(totalDettes, devise)}</span></div>
                            <div className="flex justify-between text-sm pt-3 border-t border-gray-100"><span className="font-semibold text-gray-900">Bénéfice théorique</span><span className={`font-bold ${beneficeTheorique >= 0 ? "text-gray-700" : "text-red-500"}`}>= {fmt(beneficeTheorique, devise)}</span></div>
                          </div>
                        </>
                      )}
                      <button onClick={() => setPopup(null)} className="mt-5 w-full py-3 rounded-xl bg-gray-100 text-sm font-medium text-gray-600">Fermer</button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Carte production extensible */}
          {(() => {
            const valeurProduction = data.productionsMois.reduce((s, p) =>
              s + p.briques.reduce((bs, b) => bs + b.quantiteAjoutee * b.brique.prixVente, 0), 0);
            return (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button onClick={() => setProductionExpanded(v => !v)}
                  className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Factory size={16} className="text-amber-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-gray-400">Productions</p>
                      <p className="text-sm font-bold text-amber-700">{fmt(valeurProduction, devise)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{data.productionsMois.length} session(s)</span>
                    {productionExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </button>

                {productionExpanded && (
                  <div className="border-t border-gray-50 px-4 pb-3">
                    {data.productionsMois.length === 0 && (
                      <p className="text-xs text-gray-300 py-3 text-center">Aucune production sur cette période</p>
                    )}
                    {data.productionsMois.slice(0, 10).map(p => {
                      const valeur = p.briques.reduce((s, b) => s + b.quantiteAjoutee * b.brique.prixVente, 0);
                      return (
                        <div key={p.id} className="py-3 border-b border-gray-50 last:border-0">
                          <div className="flex justify-between mb-1.5">
                            <p className="text-xs font-semibold text-gray-700">{new Date(p.date).toLocaleDateString("fr-FR")}</p>
                            <p className="text-xs font-bold text-amber-700">{fmt(valeur, devise)}</p>
                          </div>
                          {p.briques.map((b, i) => (
                            <div key={i} className="flex justify-between items-center py-0.5 pl-2">
                              <div>
                                <span className="text-xs text-gray-600">{b.brique.nom}{b.brique.dimensions ? ` — ${b.brique.dimensions}` : ""}</span>
                                {b.nombreSacs > 0 && <span className="text-xs text-gray-400 ml-1.5">· {b.nombreSacs} sac(s)</span>}
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-gray-500">{b.quantiteAjoutee} unités</span>
                                <span className="text-xs text-gray-400 ml-1.5">· {fmt(b.quantiteAjoutee * b.brique.prixVente, devise)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {data.productionsMois.length > 10 && (
                      <button onClick={() => router.push("/finances")}
                        className="w-full py-2 text-xs text-green-600 font-medium border-t border-gray-50 mt-1">
                        Voir les {data.productionsMois.length - 10} autres productions →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Graphique CA vs Dépenses */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-700 mb-3">CA vs Dépenses</p>
            {data.historique.every(h => h.ca === 0 && h.depenses === 0) ? (
              <div className="h-36 flex items-center justify-center">
                <p className="text-xs text-gray-300">Aucune donnée sur cette période</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.historique} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  barSize={data.historique.length > 20 ? 4 : data.historique.length > 10 ? 8 : 14}>
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false}
                    interval={data.historique.length > 15 ? Math.floor(data.historique.length / 8) : 0} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: number) => fmt(v, devise)} labelStyle={{ fontSize: 11 }}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="ca" name="CA" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="depenses" name="Dépenses" fill="#f97316" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Donut répartition dépenses */}
          {data.repartitionDepenses.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">Répartition des dépenses</p>
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  <PieChart width={120} height={120}>
                    <Pie data={data.repartitionDepenses} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={56} paddingAngle={3}>
                      {data.repartitionDepenses.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </div>
                <div className="flex-1 space-y-2.5">
                  {data.repartitionDepenses.map(r => (
                    <div key={r.name}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                          <span className="text-xs text-gray-600">{r.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-800">
                          {totalDonut > 0 ? Math.round(r.value / totalDonut * 100) : 0}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 ml-4">{fmt(r.value, devise)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top 5 clients */}
          {data.top5Clients.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-green-600" />
                  <p className="text-xs font-semibold text-gray-700">Top clients</p>
                </div>
                <button onClick={() => router.push("/clients")}
                  className="flex items-center gap-0.5 text-xs text-green-600 font-medium">
                  Voir tous <ChevronRight size={13} />
                </button>
              </div>
              {data.top5Clients.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-green-700">{c.nom[0].toUpperCase()}</span>
                  </div>
                  <p className="text-xs font-medium text-gray-800 flex-1 truncate">{c.nom}</p>
                  <p className="text-xs font-bold text-green-600 shrink-0">{fmt(c.total, devise)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Top 5 fournisseurs */}
          {data.top5Fournisseurs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-blue-600" />
                  <p className="text-xs font-semibold text-gray-700">Top fournisseurs</p>
                </div>
                <button onClick={() => router.push("/fournisseurs")}
                  className="flex items-center gap-0.5 text-xs text-blue-600 font-medium">
                  Voir tous <ChevronRight size={13} />
                </button>
              </div>
              {data.top5Fournisseurs.map((f, i) => (
                <div key={f.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Building2 size={12} className="text-blue-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-800 flex-1 truncate">{f.nom}</p>
                  <p className="text-xs font-bold text-blue-600 shrink-0">{fmt(f.total, devise)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
