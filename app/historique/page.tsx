export const dynamic = "force-dynamic";
"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, FileText } from "lucide-react";

type Produit = { briqueId: number; nom: string; dimensions: string | null; quantite: number; unite: string };
type Mouvement = { id: string; type: "entree" | "sortie"; categorie: string; date: string; source: string; notes: string; produits: Produit[] };

const CAT_CONFIG: Record<string, { label: string; color: string }> = {
  production:             { label: "Production",  color: "bg-green-100 text-green-800" },
  vente:                  { label: "Vente",        color: "bg-blue-100 text-blue-800" },
  vol:                    { label: "Vol",          color: "bg-red-100 text-red-800" },
  casse:                  { label: "Casse",        color: "bg-yellow-100 text-yellow-800" },
  perte:                  { label: "Perte",        color: "bg-orange-100 text-orange-800" },
  annulation_production:  { label: "Annulation",   color: "bg-gray-100 text-gray-600" },
  autre:                  { label: "Autre",        color: "bg-gray-100 text-gray-600" },
};

function nomProduit(nom: string, dim: string | null) { return dim ? `${nom} — ${dim}` : nom; }

export default function Historique() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") as "sortie" | "entree" | null;

  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeHist, setTypeHist] = useState<"sortie" | "entree">(typeParam ?? "sortie");
  const [search, setSearch] = useState("");
  const [catFiltres, setCatFiltres] = useState<string[]>([]);

  useEffect(() => { if (typeParam) setTypeHist(typeParam); }, [typeParam]);

  useEffect(() => {
    fetch("/api/stock/historique")
      .then(r => r.json())
      .then(data => { setMouvements(data); setLoading(false); });
  }, []);

  function switchType(t: "sortie" | "entree") {
    setTypeHist(t); setCatFiltres([]); setSearch("");
  }

  const parType = mouvements.filter(m => m.type === typeHist);
  const catsDispos = [...new Set(parType.map(m => m.categorie))];
  const parCat = catFiltres.length > 0 ? parType.filter(m => catFiltres.includes(m.categorie)) : parType;

  const contenu = search
    ? parCat.filter(m =>
        m.source.toLowerCase().includes(search.toLowerCase()) ||
        m.produits.some(p => nomProduit(p.nom, p.dimensions).toLowerCase().includes(search.toLowerCase()))
      )
    : parCat;

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-base font-semibold text-gray-900">Historique</h1>
        <p className="text-xs text-gray-500">Mouvements de stock</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Toggle Sorties / Entrées */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([["sortie", "Sorties"], ["entree", "Entrées"]] as const).map(([val, label]) => (
            <button key={val} onClick={() => switchType(val)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${typeHist === val ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Filtre catégories */}
        {catsDispos.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {catsDispos.map(cat => {
              const cfg = CAT_CONFIG[cat] ?? { label: cat, color: "bg-gray-100 text-gray-600" };
              const actif = catFiltres.includes(cat);
              return (
                <button key={cat}
                  onClick={() => setCatFiltres(f => actif ? f.filter(c => c !== cat) : [...f, cat])}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${actif ? cfg.color + " border-transparent" : "bg-white border-gray-200 text-gray-500"}`}>
                  {cfg.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Recherche */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par source ou produit…"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-white" />
        </div>

        <p className="text-xs text-gray-400">{contenu.length} résultat(s)</p>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && contenu.length === 0 && (
          <div className="text-center py-12">
            <FileText size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucun mouvement trouvé</p>
          </div>
        )}

        {contenu.slice(0, 50).map(c => {
          const cfg = CAT_CONFIG[c.categorie] ?? { label: c.categorie, color: "bg-gray-100 text-gray-600" };
          const isAnnulation = c.categorie === "annulation_production";
          return (
            <div key={c.id} className={`bg-white rounded-xl border p-4 ${isAnnulation ? "border-gray-200 opacity-70" : "border-gray-100"}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(c.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.source}</p>
                </div>
                <span className={`text-sm font-bold ml-3 shrink-0 ${isAnnulation ? "text-gray-400 line-through" : typeHist === "entree" ? "text-green-600" : "text-red-500"}`}>
                  {typeHist === "entree" ? "+" : "−"}
                </span>
              </div>

              <div className="space-y-1">
                {c.produits.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 truncate max-w-[65%]">{nomProduit(p.nom, p.dimensions)}</span>
                    <span className={`text-xs font-semibold shrink-0 ${isAnnulation ? "text-gray-400 line-through" : "text-gray-900"}`}>
                      {p.quantite.toLocaleString()} {p.unite}
                    </span>
                  </div>
                ))}
              </div>

              {c.notes && c.notes !== c.categorie && (
                <p className="text-xs text-gray-400 mt-2 italic truncate">{c.notes}</p>
              )}
            </div>
          );
        })}

        {contenu.length > 50 && (
          <p className="text-xs text-gray-400 text-center py-2">50 premiers résultats — affinez la recherche.</p>
        )}
      </div>
    </div>
  );
}
