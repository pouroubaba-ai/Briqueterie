"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, Package, Building2, Phone } from "lucide-react";

type Fournisseur = {
  id: number; nom: string; telephone: string; adresse: string; notes: string;
  totalAchats: number; totalVerse: number; totalDu: number;
};

type Forme = { nom: string; telephone: string; adresse: string; notes: string };

export default function Fournisseurs() {
  const router = useRouter();
  const [liste, setListe] = useState<Fournisseur[]>([]);
  const [devise, setDevise] = useState("FCFA");
  const [filtre, setFiltre] = useState<"tous" | "debiteurs" | "soldes">("tous");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [form, setForm] = useState<Forme>({ nom: "", telephone: "", adresse: "", notes: "" });

  function fmt(n: number) { return devise + " " + n.toLocaleString("fr-FR"); }

  function load() {
    fetch("/api/fournisseurs").then(r => r.json()).then(setListe);
  }

  useEffect(() => {
    fetch("/api/parametres").then(r => r.json()).then(p => { if (p.devise) setDevise(p.devise); });
    load();
  }, []);

  async function save() {
    if (savingRef.current || !form.nom.trim()) return;
    savingRef.current = true; setSaving(true);
    try {
      const res = await fetch("/api/fournisseurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const e = await res.json(); alert(e.error); return; }
      setShowForm(false);
      setForm({ nom: "", telephone: "", adresse: "", notes: "" });
      load();
    } finally { savingRef.current = false; setSaving(false); }
  }

  const listeFiltree = liste.filter(f => {
    if (filtre === "debiteurs") return f.totalDu > 0;
    if (filtre === "soldes") return f.totalAchats > 0 && f.totalDu <= 0;
    return true;
  });

  const totalAchatsGlobal = listeFiltree.reduce((s, f) => s + f.totalAchats, 0);
  const totalVerseGlobal = listeFiltree.reduce((s, f) => s + f.totalVerse, 0);
  const totalDuGlobal = listeFiltree.reduce((s, f) => s + f.totalDu, 0);

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Fournisseurs</h1>
            <p className="text-xs text-gray-500">{listeFiltree.length} / {liste.length} fournisseur(s)</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium">
            <Plus size={14} /> Ajouter
          </button>
        </div>

        {/* Filtres */}
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {([
            { key: "tous",       label: "Tous",       active: "bg-gray-900 text-white border-gray-900" },
            { key: "debiteurs",  label: "On leur doit", active: "bg-red-500 text-white border-red-500" },
            { key: "soldes",     label: "Soldés",     active: "bg-green-600 text-white border-green-600" },
          ] as const).map(({ key, label, active }) => (
            <button key={key} onClick={() => setFiltre(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filtre === key ? active : "bg-white text-gray-500 border-gray-200"}`}>
              {label}
              {key === "debiteurs" && liste.filter(f => f.totalDu > 0).length > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${filtre === key ? "bg-white/20" : "bg-red-100 text-red-600"}`}>
                  {liste.filter(f => f.totalDu > 0).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Résumé global */}
        {liste.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Total achats", value: totalAchatsGlobal, color: "text-gray-900" },
              { label: "Versé",        value: totalVerseGlobal,  color: "text-green-600" },
              { label: "Dû",           value: totalDuGlobal,     color: totalDuGlobal > 0 ? "text-red-500" : "text-gray-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className={`text-xs font-bold ${color}`}>{fmt(value)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Liste */}
        {listeFiltree.length === 0 && (
          <div className="text-center py-16">
            <Building2 size={44} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">
              {filtre === "debiteurs" ? "Aucune dette en cours" : filtre === "soldes" ? "Aucun fournisseur soldé" : "Aucun fournisseur"}
            </p>
            {filtre === "tous" && <p className="text-gray-300 text-xs mt-1">Ajoutez votre premier fournisseur</p>}
          </div>
        )}

        {listeFiltree.map(f => (
          <button key={f.id} onClick={() => router.push(`/fournisseurs/${f.id}`)}
            className="w-full bg-white rounded-xl border border-gray-100 p-4 text-left active:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Building2 size={14} className="text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{f.nom}</p>
                    {f.telephone && (
                      <div className="flex items-center gap-1">
                        <Phone size={10} className="text-gray-400" />
                        <p className="text-xs text-gray-400">{f.telephone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-2 ml-10">
                  <div>
                    <p className="text-xs text-gray-400">Achats</p>
                    <p className="text-xs font-semibold text-gray-700">{fmt(f.totalAchats)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Versé</p>
                    <p className="text-xs font-semibold text-green-600">{fmt(f.totalVerse)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Dû</p>
                    <p className={`text-xs font-semibold ${f.totalDu > 0 ? "text-red-500" : "text-gray-400"}`}>{fmt(f.totalDu)}</p>
                  </div>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 mt-1 shrink-0" />
            </div>
          </button>
        ))}
      </div>

      {/* Modal ajout fournisseur */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Nouveau fournisseur</h2>

            <div>
              <label className="text-xs text-gray-500 font-medium">Nom *</label>
              <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
                placeholder="Nom du fournisseur" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Téléphone</label>
              <input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
                placeholder="+221 77 000 00 00" type="tel" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Adresse</label>
              <input value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
                placeholder="Adresse" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none"
                rows={2} placeholder="Notes optionnelles" />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">
                Annuler
              </button>
              <button onClick={save} disabled={saving || !form.nom.trim()}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-medium disabled:opacity-50">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
