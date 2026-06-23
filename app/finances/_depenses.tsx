"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Receipt } from "lucide-react";

type Depense = { id: number; date: string; montant: number; categorie: string; description: string };

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

export default function DepensesTab({ devise }: { devise: string }) {
  const [liste, setListe] = useState<Depense[]>([]);
  const [periode, setPeriode] = useState<Periode>("mois");
  const [customDe, setCustomDe] = useState(new Date().toISOString().slice(0, 10));
  const [customA, setCustomA] = useState(new Date().toISOString().slice(0, 10));
  const [filtreCat, setFiltreCat] = useState<string>("tout");
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Depense | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [form, setForm] = useState({ montant: "", categorie: "", description: "", date: new Date().toISOString().slice(0, 10) });

  function fmt(n: number) { return `${devise} ${Math.round(n).toLocaleString("fr-FR")}`; }
  function load() {
    const { de, a } = getRange(periode, customDe, customA);
    fetch(`/api/depenses?de=${de}&a=${a}`).then(r => r.json()).then(setListe);
  }
  useEffect(() => { load(); }, [periode, customDe, customA]);

  async function save() {
    if (savingRef.current || !form.montant || Number(form.montant) <= 0) return;
    savingRef.current = true; setSaving(true);
    try {
      const res = await fetch("/api/depenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, montant: Number(form.montant) }) });
      if (!res.ok) { const e = await res.json(); alert(e.error); return; }
      setShowForm(false); setForm({ montant: "", categorie: "", description: "", date: new Date().toISOString().slice(0, 10) }); load();
    } finally { savingRef.current = false; setSaving(false); }
  }

  async function supprimer() {
    if (!confirmDelete) return;
    await fetch(`/api/depenses?id=${confirmDelete.id}`, { method: "DELETE" });
    setConfirmDelete(null);
    load();
  }

  const catsDispos = [...new Set(liste.map(d => d.categorie))];
  const listeFiltree = filtreCat === "tout" ? liste : liste.filter(d => d.categorie === filtreCat);
  const total = listeFiltree.reduce((s, d) => s + d.montant, 0);
  const totalMois = liste.reduce((s, d) => s + d.montant, 0);
  const parCat = catsDispos.map(nom => ({ nom, total: liste.filter(d => d.categorie === nom).reduce((s, d) => s + d.montant, 0) })).sort((a, b) => b.total - a.total);

  const derniersMois = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const val = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return { val, label };
  });

  return (
    <div className="pb-6">
      <div className="bg-white border-b border-gray-100 px-4 pt-3 pb-3">
        <div className="flex items-center gap-2 mb-2.5">
          <select
            value={periode}
            onChange={e => setPeriode(e.target.value as Periode)}
            className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:border-green-500"
          >
            <option value="jour">Aujourd'hui</option>
            <option value="semaine">Cette semaine</option>
            <option value="mois">Ce mois</option>
            <option value="annee">Cette année</option>
            <option value="custom">Personnalisé</option>
          </select>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium shrink-0"><Plus size={14} /> Ajouter</button>
        </div>
        {periode === "custom" && (
          <div className="flex gap-2 mb-2">
            <input type="date" value={customDe} onChange={e => setCustomDe(e.target.value)} className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
            <span className="text-xs text-gray-400 self-center">→</span>
            <input type="date" value={customA} onChange={e => setCustomA(e.target.value)} className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
          </div>
        )}
        {catsDispos.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setFiltreCat("tout")} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filtreCat === "tout" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200"}`}>Tout</button>
            {catsDispos.map(cat => (
              <button key={cat} onClick={() => setFiltreCat(cat)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filtreCat === cat ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200"}`}>{cat}</button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {liste.length > 0 && (
          <>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-medium">Total — {periode === "jour" ? "Aujourd'hui" : periode === "semaine" ? "Cette semaine" : periode === "mois" ? "Ce mois" : periode === "annee" ? "Cette année" : "Période personnalisée"}</p>
                {filtreCat !== "tout" && <p className="text-xs text-red-400 mt-0.5">Filtre : {filtreCat}</p>}
              </div>
              <p className="text-base font-bold text-red-600">{fmt(filtreCat === "tout" ? totalMois : total)}</p>
            </div>
            {filtreCat === "tout" && parCat.length > 1 && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Répartition</p>
                {parCat.map(c => (
                  <div key={c.nom} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">{c.nom}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{ width: `${(c.total / totalMois) * 100}%` }} /></div>
                      <span className="text-xs font-semibold text-gray-700 w-24 text-right">{fmt(c.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {listeFiltree.length === 0 && (
          <div className="text-center py-14"><Receipt size={44} className="text-gray-200 mx-auto mb-3" /><p className="text-gray-400 text-sm font-medium">Aucune dépense</p><p className="text-gray-300 text-xs mt-1">Appuyez sur Ajouter pour commencer</p></div>
        )}

        {listeFiltree.map(d => (
          <div key={d.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">{d.categorie || "Sans nom"}</span>
                <span className="text-xs text-gray-400">{new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</span>
              </div>
              {d.description && <p className="text-xs text-gray-500 truncate">{d.description}</p>}
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
              <p className="text-sm font-bold text-red-600">− {fmt(d.montant)}</p>
              <button onClick={() => setConfirmDelete(d)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Nouvelle dépense</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500 font-medium">Montant *</label><input type="number" min={0} value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" placeholder="0" /></div>
              <div><label className="text-xs text-gray-500 font-medium">Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" /></div>
            </div>
            <div><label className="text-xs text-gray-500 font-medium">Nom de la dépense *</label><input value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" placeholder="Ex: Carburant, Réparation moteur…" /></div>
            <div><label className="text-xs text-gray-500 font-medium">Description</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" placeholder="Ex: Achat groupe électrogène…" /></div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">Annuler</button>
              <button onClick={save} disabled={saving || !form.montant || Number(form.montant) <= 0} className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-medium disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Supprimer cette dépense ?</h2>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <p className="text-sm font-medium text-gray-800">{confirmDelete.categorie || "Sans nom"}</p>
              <p className="text-xs text-gray-400">{new Date(confirmDelete.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
              <p className="text-sm font-bold text-red-600 mt-1">− {fmt(confirmDelete.montant)}</p>
            </div>
            <p className="text-xs text-gray-400">Cette action est irréversible.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">Annuler</button>
              <button onClick={supprimer} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-medium">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
