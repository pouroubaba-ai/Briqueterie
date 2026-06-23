"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Package, Pencil, Trash2, AlertTriangle, X, TrendingDown } from "lucide-react";

type Brique = { id: number; nom: string; dimensions: string | null; prixVente: number; stockActuel: number; stockMin: number; estCiment: boolean };
function nomProduit(nom: string, dimensions: string | null) { return dimensions ? `${nom} — ${dimensions}` : nom; }
type SortieForm = { briqueId: number; quantite: number; type: string; notes: string; date: string };


const TYPES_SORTIE = [
  { value: "vol", label: "Vol", color: "bg-red-100 text-red-800" },
  { value: "casse", label: "Casse", color: "bg-yellow-100 text-yellow-800" },
  { value: "perte", label: "Perte", color: "bg-blue-100 text-blue-800" },
  { value: "autre", label: "Autre", color: "bg-gray-100 text-gray-600" },
];

export default function Stock() {
  const [briques, setBriques] = useState<Brique[]>([]);
  const [devise, setDevise] = useState("FCFA");
  const [showForm, setShowForm] = useState(false);
  const [showSortie, setShowSortie] = useState(false);
  const [editing, setEditing] = useState<Brique | null>(null);
  const [form, setForm] = useState({ nom: "", dimensions: "", prixVente: 0, stockActuel: 0, stockMin: 0, estCiment: false });
  const [sortieForm, setSortieForm] = useState<SortieForm>({ briqueId: 0, quantite: 1, type: "vol", notes: "", date: new Date().toISOString().slice(0, 10) });
  const [savingBrique, setSavingBrique] = useState(false);
  const [savingSortie, setSavingSortie] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Brique | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState("");
  const [formError, setFormError] = useState("");
  const savingBriqueRef = useRef(false);
  const savingSortieRef = useRef(false);

  function load() {
    fetch("/api/briques").then(r => r.json()).then(setBriques);
    fetch("/api/parametres").then(r => r.json()).then(p => { if (p.devise) setDevise(p.devise); });
  }
  useEffect(load, []);

  function openNew() { setForm({ nom: "", dimensions: "", prixVente: 0, stockActuel: 0, stockMin: 0, estCiment: false }); setEditing(null); setFormError(""); setShowForm(true); }
  function openEdit(b: Brique) { setForm({ nom: b.nom, dimensions: b.dimensions ?? "", prixVente: b.prixVente, stockActuel: b.stockActuel, stockMin: b.stockMin, estCiment: b.estCiment }); setEditing(b); setFormError(""); setShowForm(true); }

  async function save() {
    if (!form.nom.trim()) { setFormError("Le nom du produit est requis."); return; }
    if (!form.prixVente || form.prixVente <= 0) { setFormError("Le prix de vente est requis."); return; }
    setFormError("");
    if (savingBriqueRef.current) return;
    savingBriqueRef.current = true; setSavingBrique(true);
    try {
      if (editing) {
        await fetch(`/api/briques/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      } else {
        await fetch("/api/briques", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      }
      setShowForm(false); load();
    } finally { savingBriqueRef.current = false; setSavingBrique(false); }
  }

  async function del() {
    if (!confirmDel || deleting) return;
    setDeleting(true); setDelError("");
    try {
      const res = await fetch(`/api/briques/${confirmDel.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setDelError(data.message ?? "Suppression impossible.");
        return;
      }
      setConfirmDel(null); load();
    } finally { setDeleting(false); }
  }

  async function saveSortie() {
    if (savingSortieRef.current || !sortieForm.briqueId || sortieForm.quantite <= 0) return;
    savingSortieRef.current = true; setSavingSortie(true);
    try {
      const res = await fetch("/api/sorties-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sortieForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert("Erreur : " + (err.error || res.status));
        return;
      }
      setShowSortie(false);
      setSortieForm({ briqueId: 0, quantite: 1, type: "vol", notes: "", date: new Date().toISOString().slice(0, 10) });
      load();
    } finally { savingSortieRef.current = false; setSavingSortie(false); }
  }

  const totalValeur = briques.reduce((s, b) => s + b.stockActuel * b.prixVente, 0);

  const [filtre, setFiltre] = useState<"tous" | "ok" | "alerte" | "rupture">("tous");

  const briquesFiltrees = briques.filter(b => {
    if (filtre === "rupture") return b.stockActuel === 0;
    if (filtre === "alerte") return b.stockActuel > 0 && b.stockMin > 0 && b.stockActuel <= b.stockMin;
    if (filtre === "ok") return b.stockActuel > 0 && (b.stockMin === 0 || b.stockActuel > b.stockMin);
    return true;
  });

  return (
    <div className="pb-4">
      <div className="bg-white border-b border-gray-200 px-4 py-4 z-10 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Inventaire</h1>
          <p className="text-xs text-gray-500">{briques.length} produit(s)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSortie(true)} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-medium">
            <TrendingDown size={14} /> Sortie
          </button>
          <button onClick={openNew} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium">
            <Plus size={14} /> Ajouter
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {([
            ["tous",    "Tous",      "bg-gray-100 text-gray-600"],
            ["ok",      "En stock",  "bg-green-100 text-green-700"],
            ["alerte",  "Alerte",    "bg-yellow-100 text-yellow-700"],
            ["rupture", "Rupture",   "bg-red-100 text-red-700"],
          ] as const).map(([val, label, color]) => (
            <button key={val} onClick={() => setFiltre(val)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${filtre === val ? color + " border-transparent" : "bg-white border-gray-200 text-gray-500"}`}>
              {label}
              {val !== "tous" && (
                <span className="ml-1 opacity-60">
                  ({briques.filter(b =>
                    val === "rupture" ? b.stockActuel === 0 :
                    val === "alerte"  ? b.stockActuel > 0 && b.stockMin > 0 && b.stockActuel <= b.stockMin :
                    b.stockActuel > 0 && (b.stockMin === 0 || b.stockActuel > b.stockMin)
                  ).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {briquesFiltrees.length === 0 && briques.length === 0 && (
          <div className="text-center py-12">
            <Package size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucun produit enregistré</p>
            <button onClick={openNew} className="mt-3 text-green-600 text-sm font-medium">+ Ajouter</button>
          </div>
        )}
        {briquesFiltrees.length === 0 && briques.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">Aucun produit dans cette catégorie</p>
          </div>
        )}

        {briquesFiltrees.map(b => {
          const pct = b.stockMin > 0 ? Math.min((b.stockActuel / (b.stockMin * 5)) * 100, 100) : 60;
          const alerte = b.stockMin > 0 && b.stockActuel <= b.stockMin;
          return (
            <div key={b.id} className={`bg-white rounded-xl border p-4 ${alerte ? "border-red-200" : "border-gray-100"}`}>
              {alerte && (
                <div className="flex items-center gap-1 text-xs text-red-600 mb-2">
                  <AlertTriangle size={12} /> Stock bas — en dessous du minimum
                </div>
              )}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{nomProduit(b.nom, b.dimensions)}</p>
                    {b.estCiment && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">Ciment</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => { setConfirmDel(b); setDelError(""); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Stock</p>
                  <p className="text-sm font-semibold text-gray-900">{b.stockActuel.toLocaleString()} u.</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Prix/u</p>
                  <p className="text-sm font-semibold text-gray-900">{devise} {b.prixVente.toLocaleString()}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Valeur</p>
                  <p className="text-sm font-semibold text-green-700">{devise} {(b.stockActuel * b.prixVente).toLocaleString()}</p>
                </div>
              </div>

              <div className="w-full h-1.5 bg-gray-100 rounded">
                <div className={`h-1.5 rounded transition-all ${alerte ? "bg-red-400" : pct < 40 ? "bg-yellow-400" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
              </div>
              {b.stockMin > 0 && <p className="text-xs text-gray-400 mt-1">Stock minimum : {b.stockMin} u.</p>}
            </div>
          );
        })}

        {briquesFiltrees.length > 0 && (
          <div className="bg-green-50 rounded-xl border border-green-100 p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-green-800">Valeur totale du stock</span>
            <span className="text-base font-bold text-green-700">{devise} {totalValeur.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Modal brique */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-24 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-gray-900">{editing ? "Modifier le produit" : "Nouveau produit"}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            {[
              { label: "Nom du produit", key: "nom", type: "text", placeholder: "Ex: Brique standard, Sable, Ciment…" },
              { label: "Dimensions (optionnel)", key: "dimensions", type: "text", placeholder: "Ex: 10×20×40 cm" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <input value={form[key as keyof typeof form] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Prix vente", key: "prixVente" },
                { label: "Stock actuel", key: "stockActuel" },
                { label: "Stock min.", key: "stockMin" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <input type="number" value={form[key as keyof typeof form] as number}
                    onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
                </div>
              ))}
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, estCiment: !f.estCiment }))}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${form.estCiment ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200"}`}
            >
              <div className="text-left">
                <p className={`text-xs font-medium ${form.estCiment ? "text-orange-700" : "text-gray-600"}`}>Ce produit est du ciment</p>
                <p className="text-xs text-gray-400 mt-0.5">Permet de déduire les sacs lors des productions</p>
              </div>
              <div className={`w-9 h-5 rounded-full relative shrink-0 transition-colors ${form.estCiment ? "bg-orange-500" : "bg-gray-300"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.estCiment ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </button>
            {formError && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <span className="text-red-500">⚠</span> {formError}
              </div>
            )}
            <button onClick={save} disabled={savingBrique} className="w-full bg-green-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-60">
              {savingBrique ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Ajouter la brique"}
            </button>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-24 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Supprimer ce produit ?</h2>
              <button onClick={() => setConfirmDel(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-900">{confirmDel.nom}</p>
              <p className="text-xs text-gray-500 mt-0.5">{[confirmDel.dimensions, `Stock : ${confirmDel.stockActuel} unités`].filter(Boolean).join(" · ")}</p>
            </div>
            {delError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700 font-medium">{delError}</p>
              </div>
            )}
            {!delError && (
              <p className="text-xs text-gray-500 text-center">Cette action est irréversible.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmDel(null)}
                className="py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">
                Annuler
              </button>
              <button onClick={del} disabled={deleting || !!delError}
                className="py-3 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-50">
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal sortie stock */}
      {showSortie && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-24 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-gray-900">Sortie hors vente</h2>
              <button onClick={() => setShowSortie(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Brique</label>
              <select value={sortieForm.briqueId} onChange={e => setSortieForm(f => ({ ...f, briqueId: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 bg-white">
                <option value={0}>Choisir une brique</option>
                {briques.map(b => <option key={b.id} value={b.id}>{nomProduit(b.nom, b.dimensions)} ({b.stockActuel} u.)</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type de sortie</label>
              <div className="grid grid-cols-4 gap-2">
                {TYPES_SORTIE.map(t => (
                  <button key={t.value} onClick={() => setSortieForm(f => ({ ...f, type: t.value }))}
                    className={`py-2 rounded-lg text-xs font-medium border transition-all ${sortieForm.type === t.value ? t.color + " border-current" : "border-gray-200 text-gray-500"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Quantité</label>
                <input type="number" min={1} value={sortieForm.quantite} onChange={e => setSortieForm(f => ({ ...f, quantite: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date</label>
                <input type="date" value={sortieForm.date} onChange={e => setSortieForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Note (optionnel)</label>
              <input value={sortieForm.notes} onChange={e => setSortieForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Ex: Vol constaté côté ouest"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>
            {sortieForm.briqueId > 0 && (
              <div className="bg-red-50 rounded-lg p-3 text-xs text-red-700">
                Valeur de la sortie : {devise} {((briques.find(b => b.id === sortieForm.briqueId)?.prixVente ?? 0) * sortieForm.quantite).toLocaleString()}
              </div>
            )}
            <button onClick={saveSortie} disabled={!sortieForm.briqueId || savingSortie}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-40">
              {savingSortie ? "Enregistrement…" : "Enregistrer la sortie"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
