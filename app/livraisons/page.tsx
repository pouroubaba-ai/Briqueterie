"use client";
import { useEffect, useRef, useState } from "react";
import { Truck, ChevronRight, Plus, X } from "lucide-react";
import Link from "next/link";

type Livraison = {
  id: number; numero: string; statut: string; dateLivraison: string;
  commande: { client: { nom: string }; acompte: number };
  lignes: { quantiteLivree: number; quantiteCommandee: number; brique: { nom: string; prixVente: number } }[];
  facture: { id: number } | null;
};

type Commande = { id: number; numero: string; client: { nom: string }; lignes: { id: number; quantite: number; prixUnit: number; brique: { id: number; nom: string; dimensions: string | null } }[]; livraison: null | object };

export default function Livraisons() {
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [devise, setDevise] = useState("FCFA");
  const [showForm, setShowForm] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [lignes, setLignes] = useState<{ briqueId: number; quantiteCommandee: number; quantiteLivree: number }[]>([]);
  const [dateLivraison, setDateLivraison] = useState(new Date().toISOString().slice(0, 10));
  const [livreur, setLivreur] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [savingFacture, setSavingFacture] = useState<number | null>(null);
  const savingFactureRef = useRef(false);

  function load() {
    fetch("/api/livraisons").then(r => r.json()).then(setLivraisons);
    fetch("/api/commandes").then(r => r.json()).then((cs: Commande[]) => setCommandes(cs.filter(c => !c.livraison)));
    fetch("/api/parametres").then(r => r.json()).then(p => { if (p.devise) setDevise(p.devise); });
  }
  useEffect(load, []);

  function selectCommande(id: number) {
    const c = commandes.find(c => c.id === id) ?? null;
    setSelectedCommande(c);
    if (c) setLignes(c.lignes.map(l => ({ briqueId: l.brique.id, quantiteCommandee: l.quantite, quantiteLivree: l.quantite })));
  }

  async function save() {
    if (savingRef.current || !selectedCommande) return;
    savingRef.current = true; setSaving(true);
    try {
      await fetch("/api/livraisons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commandeId: selectedCommande.id, dateLivraison, livreur, notes, lignes }) });
      setShowForm(false); setSelectedCommande(null); setLignes([]); load();
    } finally { savingRef.current = false; setSaving(false); }
  }

  async function creerFacture(livraisonId: number) {
    if (savingFactureRef.current) return;
    savingFactureRef.current = true; setSavingFacture(livraisonId);
    try {
      const echeance = new Date(); echeance.setDate(echeance.getDate() + 14);
      await fetch("/api/factures", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ livraisonId, dateEcheance: echeance.toISOString() }) });
      load();
    } finally { savingFactureRef.current = false; setSavingFacture(null); }
  }

  return (
    <div className="pb-4">
      <div className="bg-white border-b border-gray-200 px-4 py-4 z-10 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Livraisons</h1>
          <p className="text-xs text-gray-500">{livraisons.length} livraison(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium">
          <Plus size={14} /> Nouvelle
        </button>
      </div>

      <div className="p-4 space-y-3">
        {livraisons.length === 0 && (
          <div className="text-center py-12">
            <Truck size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucune livraison</p>
          </div>
        )}
        {livraisons.map(l => {
          const total = l.lignes.reduce((s, li) => s + li.quantiteLivree * li.brique.prixVente, 0);
          const hasEcart = l.lignes.some(li => li.quantiteLivree < li.quantiteCommandee);
          return (
            <div key={l.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{l.commande.client.nom}</p>
                  <p className="text-xs text-gray-400">{l.numero} · {new Date(l.dateLivraison).toLocaleDateString("fr-FR")}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-800">Livré</span>
              </div>
              {hasEcart && <p className="text-xs text-yellow-600 mb-2">⚠ Livraison partielle — écart détecté</p>}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500">{l.lignes.length} article(s)</p>
                <p className="text-sm font-bold text-gray-900">{devise} {total.toLocaleString()}</p>
              </div>
              {!l.facture ? (
                <button onClick={() => creerFacture(l.id)} disabled={savingFacture === l.id} className="w-full py-2 rounded-lg bg-green-600 text-white text-xs font-medium disabled:opacity-60">
                  {savingFacture === l.id ? "Création…" : "Créer la facture"}
                </button>
              ) : (
                <Link href={`/factures/${l.facture.id}`} className="flex items-center justify-center gap-1 w-full py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600">
                  Voir la facture <ChevronRight size={12} />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-24 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Nouvelle livraison</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">Commande à livrer</label>
              <select onChange={e => selectCommande(Number(e.target.value))} defaultValue={0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 bg-white">
                <option value={0}>Choisir une commande</option>
                {commandes.map(c => <option key={c.id} value={c.id}>{c.client.nom} — {c.numero}</option>)}
              </select>
            </div>

            {selectedCommande && (
              <>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Quantités livrées</p>
                {lignes.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <div className="flex-1">
                      <p className="text-xs text-gray-700">{selectedCommande.lignes[i]?.brique.nom}</p>
                      <p className="text-xs text-gray-400">Commandé: {l.quantiteCommandee}</p>
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-gray-400 block mb-1">Livré</label>
                      <input type="number" min={0} max={l.quantiteCommandee} value={l.quantiteLivree}
                        onChange={e => { const nl = [...lignes]; nl[i].quantiteLivree = Number(e.target.value); setLignes(nl); }}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-green-500" />
                    </div>
                  </div>
                ))}
              </>
            )}

            <div className="grid grid-cols-2 gap-2 mb-3 mt-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date de livraison</label>
                <input type="date" value={dateLivraison} onChange={e => setDateLivraison(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Livreur</label>
                <input value={livreur} onChange={e => setLivreur(e.target.value)} placeholder="Nom du livreur"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Remarques..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>

            <button onClick={save} disabled={!selectedCommande || saving}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-40">
              {saving ? "Enregistrement…" : "Confirmer la livraison"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
