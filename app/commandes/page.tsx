"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, ShoppingCart, ChevronRight, X, Trash2 } from "lucide-react";
import Link from "next/link";
import CycleVenteNav from "@/components/CycleVenteNav";

type Client = { id: number; nom: string; telephone: string };
type Brique = { id: number; nom: string; dimensions: string | null; prixVente: number; stockActuel: number };
type Commande = { id: number; numero: string; statut: string; createdAt: string; acompte: number; transport: number; client: { nom: string }; lignes: { quantite: number; prixUnit: number; brique: { nom: string } }[] };

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = { en_attente: "bg-yellow-100 text-yellow-800", confirme: "bg-blue-100 text-blue-800", livre: "bg-green-100 text-green-800", annule: "bg-red-100 text-red-800" };
  const labels: Record<string, string> = { en_attente: "En attente", confirme: "Confirmé", livre: "Livré", annule: "Annulé" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[statut] ?? "bg-gray-100 text-gray-600"}`}>{labels[statut] ?? statut}</span>;
}

export default function Commandes() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [filtreStatut, setFiltreStatut] = useState<"tous" | "en_cours" | "livre" | "annule">("tous");
  const [clients, setClients] = useState<Client[]>([]);
  const [briques, setBriques] = useState<Brique[]>([]);
  const [devise, setDevise] = useState("FCFA");
  const [showForm, setShowForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientForm, setClientForm] = useState({ nom: "", telephone: "", adresse: "" });
  const [form, setForm] = useState({ clientId: 0, dateLivraisonPrevue: "", acompte: 0, transport: 0, notes: "" });
  const [lignes, setLignes] = useState<{ briqueId: number; quantite: number; prixUnit: number; transportUnit: number }[]>([{ briqueId: 0, quantite: 1, prixUnit: 0, transportUnit: 0 }]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [formError, setFormError] = useState("");

  function load() {
    fetch("/api/commandes").then(r => r.json()).then(setCommandes);
    fetch("/api/clients").then(r => r.json()).then(setClients);
    fetch("/api/briques").then(r => r.json()).then(setBriques);
    fetch("/api/parametres").then(r => r.json()).then(p => { if (p.devise) setDevise(p.devise); });
  }
  useEffect(load, []);

  function selectBrique(i: number, briqueId: number) {
    const b = briques.find(b => b.id === briqueId);
    const existant = lignes.findIndex((l, j) => j !== i && l.briqueId === briqueId);
    if (existant !== -1) {
      setLignes(ls => ls.map((l, j) => j === existant ? { ...l, quantite: l.quantite + ls[i].quantite } : l).filter((_, j) => j !== i));
    } else {
      const nl = [...lignes]; nl[i] = { briqueId, quantite: nl[i].quantite, prixUnit: b?.prixVente ?? 0, transportUnit: nl[i].transportUnit }; setLignes(nl);
    }
  }

  function removeLigne(i: number) {
    if (lignes.length === 1) return;
    setLignes(lignes.filter((_, idx) => idx !== i));
  }

  const commandesFiltrees = commandes.filter(c => {
    if (filtreStatut === "tous") return true;
    if (filtreStatut === "livre") return c.statut === "livre";
    if (filtreStatut === "annule") return c.statut === "annule";
    return c.statut !== "livre" && c.statut !== "annule";
  });

  const totalTransport = lignes.reduce((s, l) => s + l.quantite * (l.transportUnit ?? 0), 0);
  const totalCommande = lignes.reduce((s, l) => s + l.quantite * l.prixUnit, 0) + totalTransport;

  async function saveClient() {
    const r = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clientForm) });
    const c = await r.json();
    setClients(cl => [...cl, c]); setForm(f => ({ ...f, clientId: c.id }));
    setShowClientForm(false); setClientForm({ nom: "", telephone: "", adresse: "" });
  }

  async function save() {
    if (savingRef.current) return;
    const validLignes = lignes.filter(l => l.briqueId > 0 && l.quantite > 0).map(l => ({ ...l, transportUnit: l.transportUnit ?? 0 }));
    if (!form.clientId || !validLignes.length) return;
    setFormError("");
    // Validation client-side
    if (form.acompte > 0 && form.acompte > totalCommande) {
      setFormError(`L'acompte (${form.acompte.toLocaleString()}) ne peut pas dépasser le total de la commande (${totalCommande.toLocaleString()}).`);
      return;
    }
    savingRef.current = true; setSaving(true);
    try {
      const res = await fetch("/api/commandes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, transport: 0, lignes: validLignes }) });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error ?? "Erreur lors de la création.");
        return;
      }
      setShowForm(false); setLignes([{ briqueId: 0, quantite: 1, prixUnit: 0, transportUnit: 0 }]); setForm({ clientId: 0, dateLivraisonPrevue: "", acompte: 0, transport: 0, notes: "" }); setFormError(""); load();
    } finally { savingRef.current = false; setSaving(false); }
  }

  return (
    <div className="pb-4">
      <div className="bg-white border-b border-gray-200 px-4 py-4 z-10 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Commandes</h1>
          <p className="text-xs text-gray-500">{commandes.length} commande(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium">
          <Plus size={14} /> Nouvelle
        </button>
      </div>

      <CycleVenteNav />
      <div className="flex gap-2 px-4 pt-3 overflow-x-auto pb-1">
        {(["tous", "en_cours", "livre", "annule"] as const).map(f => (
          <button key={f} onClick={() => setFiltreStatut(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${filtreStatut === f ? (f === "annule" ? "bg-red-600 text-white" : "bg-green-600 text-white") : "bg-gray-100 text-gray-600"}`}>
            {f === "tous" ? "Toutes" : f === "en_cours" ? "En cours" : f === "livre" ? "Livrées" : "Annulées"}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {commandesFiltrees.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucune commande</p>
          </div>
        )}
        {commandesFiltrees.map(c => {
          const total = c.lignes.reduce((s, l) => s + l.quantite * l.prixUnit, 0) + c.transport;
          return (
            <Link href={`/commandes/${c.id}`} key={c.id} className="block bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{c.client.nom}</p>
                  <p className="text-xs text-gray-400">{c.numero} · {new Date(c.createdAt).toLocaleDateString("fr-FR")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatutBadge statut={c.statut} />
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">{c.lignes.length} article(s)</p>
                <p className="text-sm font-bold text-gray-900">{devise} {total.toLocaleString()}</p>
              </div>
              {c.acompte > 0 && (
                <div className="mt-2 text-xs text-green-600">Acompte reçu : {devise} {c.acompte.toLocaleString()}</div>
              )}
            </Link>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-24 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Nouvelle commande</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-500">Client</label>
                <button onClick={() => setShowClientForm(true)} className="text-xs text-green-600 font-medium">+ Nouveau client</button>
              </div>
              <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 bg-white">
                <option value={0}>Choisir un client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.telephone && `— ${c.telephone}`}</option>)}
              </select>
            </div>

            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Articles</p>
            {lignes.map((l, i) => {
              const bSelected = briques.find(b => b.id === l.briqueId);
              return (
                <div key={i} className="mb-3 border border-gray-100 rounded-xl p-3 relative">
                  {lignes.length > 1 && (
                    <button onClick={() => removeLigne(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="mb-2">
                    <label className="text-xs text-gray-400 mb-1 block">Produit</label>
                    <select value={l.briqueId} onChange={e => selectBrique(i, Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-green-500 bg-white pr-6">
                      <option value={0}>Choisir un produit</option>
                      {briques.map(b => <option key={b.id} value={b.id}>{b.nom}{b.dimensions ? ` — ${b.dimensions}` : ""}</option>)}
                    </select>
                    {bSelected && (
                      <p className="text-xs text-gray-400 mt-1">Stock disponible : <span className={bSelected.stockActuel === 0 ? "text-red-500 font-medium" : "text-gray-600 font-medium"}>{bSelected.stockActuel.toLocaleString()} unités</span></p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Quantité</label>
                      <input type="number" min={1} value={l.quantite || ""}
                        onChange={e => { const nl = [...lignes]; nl[i].quantite = Number(e.target.value); setLignes(nl); }}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-green-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Prix/u ({devise})</label>
                      <input type="number" value={l.prixUnit || ""}
                        onChange={e => { const nl = [...lignes]; nl[i].prixUnit = Number(e.target.value); setLignes(nl); }}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-green-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Transport/u</label>
                      <input type="number" min={0} value={l.transportUnit || ""}
                        onChange={e => { const nl = [...lignes]; nl[i].transportUnit = Number(e.target.value); setLignes(nl); }}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-green-500" />
                    </div>
                  </div>
                  {l.transportUnit > 0 && l.quantite > 0 && (
                    <p className="text-xs text-blue-600 mt-1">Transport ligne : {devise} {(l.quantite * l.transportUnit).toLocaleString()}</p>
                  )}
                </div>
              );
            })}
            <button onClick={() => setLignes([...lignes, { briqueId: 0, quantite: 1, prixUnit: 0 }])} className="text-xs text-green-600 font-medium mb-3">+ Ajouter une ligne</button>

            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">Acompte reçu ({devise}) — optionnel</label>
              <input type="number" value={form.acompte || ""}
                onChange={e => { setFormError(""); setForm(f => ({ ...f, acompte: Number(e.target.value) })); }}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none ${form.acompte > 0 && form.acompte > totalCommande ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-green-500"}`} />
              {form.acompte > 0 && form.acompte > totalCommande && (
                <p className="text-xs text-red-600 mt-1">Max : {devise} {totalCommande.toLocaleString()}</p>
              )}
            </div>

            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">Livraison prévue</label>
              <input type="date" value={form.dateLivraisonPrevue} onChange={e => setForm(f => ({ ...f, dateLivraisonPrevue: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>

            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Remarques..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>

            <div className="bg-green-50 rounded-xl p-3 mb-4 space-y-1">
              <div className="flex justify-between text-xs text-gray-500"><span>Sous-total articles</span><span>{devise} {(totalCommande - totalTransport).toLocaleString()}</span></div>
              {totalTransport > 0 && <div className="flex justify-between text-xs text-gray-500"><span>Transport total</span><span>{devise} {totalTransport.toLocaleString()}</span></div>}
              <div className="flex justify-between text-sm font-bold text-green-700 pt-1 border-t border-green-100"><span>Total commande</span><span>{devise} {totalCommande.toLocaleString()}</span></div>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 text-xs text-red-700">{formError}</div>
            )}

            <button onClick={save}
              disabled={!form.clientId || saving || (form.acompte > 0 && form.acompte > totalCommande)}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-40">
              {saving ? "Création…" : "Créer la commande"}
            </button>
          </div>
        </div>
      )}

      {showClientForm && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-24 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Nouveau client</h2>
              <button onClick={() => setShowClientForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            {[
              { label: "Nom", key: "nom", placeholder: "Ex: Chantier Diallo" },
              { label: "Téléphone", key: "telephone", placeholder: "Ex: +224 655 000 000" },
              { label: "Adresse", key: "adresse", placeholder: "Ex: Matoto, Conakry" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <input value={clientForm[key as keyof typeof clientForm]} onChange={e => setClientForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
            ))}
            <button onClick={saveClient} className="w-full bg-green-600 text-white py-3 rounded-xl font-medium text-sm">Ajouter le client</button>
          </div>
        </div>
      )}
    </div>
  );
}
