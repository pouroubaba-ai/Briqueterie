export const dynamic = "force-dynamic";
"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, FileText, X, Trash2 } from "lucide-react";
import PDFButton from "@/components/PDFButton";

type Client = { id: number; nom: string; telephone: string };
type Brique = { id: number; nom: string; dimensions: string | null; prixVente: number; stockActuel: number };
type Devis = { id: number; numero: string; statut: string; createdAt: string; dateValidite: string; clientId: number; client: { nom: string }; lignes: { briqueId: number; quantite: number; prixUnit: number }[] };

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = { brouillon: "bg-gray-100 text-gray-600", envoye: "bg-blue-100 text-blue-800", accepte: "bg-green-100 text-green-800", refuse: "bg-red-100 text-red-800", confirme: "bg-purple-100 text-purple-800", expire: "bg-yellow-100 text-yellow-800" };
  const labels: Record<string, string> = { brouillon: "Brouillon", envoye: "Envoyé", accepte: "Accepté", refuse: "Refusé", confirme: "Confirmé", expire: "Expiré" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[statut] ?? "bg-gray-100 text-gray-600"}`}>{labels[statut] ?? statut}</span>;
}

export default function Devis() {
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [showConfirmes, setShowConfirmes] = useState(false);
  const [confirmSuppr, setConfirmSuppr] = useState<Devis | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [briques, setBriques] = useState<Brique[]>([]);
  const [devise, setDevise] = useState("FCFA");
  const [showForm, setShowForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientForm, setClientForm] = useState({ nom: "", telephone: "", adresse: "" });
  const defaultDate = () => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); };
  const [form, setForm] = useState({ clientId: 0, dateValidite: defaultDate(), notes: "" });
  const [lignes, setLignes] = useState<{ briqueId: number; quantite: number; prixUnit: number; description: string }[]>([{ briqueId: 0, quantite: 1, prixUnit: 0, description: "" }]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  function load() {
    fetch("/api/devis").then(r => r.json()).then(setDevisList);
    fetch("/api/clients").then(r => r.json()).then(setClients);
    fetch("/api/briques").then(r => r.json()).then(setBriques);
    fetch("/api/parametres").then(r => r.json()).then(p => { if (p.devise) setDevise(p.devise); });
  }
  useEffect(load, []);

  function selectBrique(i: number, briqueId: number) {
    const b = briques.find(b => b.id === briqueId);
    const existant = lignes.findIndex((l, j) => j !== i && l.briqueId === briqueId);
    if (existant !== -1) {
      // Fusionner avec la ligne existante
      setLignes(ls => ls.map((l, j) => j === existant ? { ...l, quantite: l.quantite + ls[i].quantite } : l).filter((_, j) => j !== i));
    } else {
      const nl = [...lignes]; nl[i] = { ...nl[i], briqueId, prixUnit: b?.prixVente ?? 0 }; setLignes(nl);
    }
  }

  function removeLigne(i: number) {
    if (lignes.length === 1) return;
    setLignes(lignes.filter((_, idx) => idx !== i));
  }

  const totalDevis = lignes.reduce((s, l) => s + l.quantite * l.prixUnit, 0);

  async function saveClient() {
    const r = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clientForm) });
    const c = await r.json();
    setClients(cl => [...cl, c]); setForm(f => ({ ...f, clientId: c.id }));
    setShowClientForm(false); setClientForm({ nom: "", telephone: "", adresse: "" });
  }

  async function save() {
    if (savingRef.current) return;
    const validLignes = lignes.filter(l => l.briqueId > 0 && l.quantite > 0).map(({ briqueId, quantite, prixUnit }) => ({ briqueId, quantite, prixUnit }));
    if (!form.clientId || !validLignes.length) return;
    savingRef.current = true; setSaving(true);
    try {
      await fetch("/api/devis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, lignes: validLignes }) });
      setShowForm(false); setLignes([{ briqueId: 0, quantite: 1, prixUnit: 0, description: "" }]); setForm({ clientId: 0, dateValidite: defaultDate(), notes: "" }); load();
    } finally { savingRef.current = false; setSaving(false); }
  }

  async function convertirCommande(devisId: number) {
    const d = devisList.find(d => d.id === devisId);
    if (!d) return;
    await fetch("/api/commandes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: d.clientId,
        devisId: d.id,
        lignes: d.lignes.map(l => ({ briqueId: l.briqueId, quantite: l.quantite, prixUnit: l.prixUnit })),
      }),
    });
    load();
  }

  async function supprimerDevis() {
    if (!confirmSuppr) return;
    await fetch("/api/devis/" + confirmSuppr.id, { method: "DELETE" });
    setConfirmSuppr(null);
    load();
  }

  return (
    <div className="pb-4">
      <div className="bg-white border-b border-gray-200 px-4 py-4 z-10 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Devis</h1>
          <p className="text-xs text-gray-500">{devisList.filter(d => d.statut !== "confirme").length} devis actifs</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium">
          <Plus size={14} /> Nouveau
        </button>
      </div>

      <div className="p-4 space-y-3">
        {devisList.filter(d => showConfirmes ? true : d.statut !== "confirme").length === 0 && (
          <div className="text-center py-12">
            <FileText size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucun devis</p>
          </div>
        )}
        {devisList.filter(d => showConfirmes ? true : d.statut !== "confirme").map(d => {
          const total = d.lignes.reduce((s, l) => s + l.quantite * l.prixUnit, 0);
          return (
            <div key={d.id} className={`bg-white rounded-xl border p-4 ${d.statut === "confirme" ? "border-purple-100 opacity-70" : "border-gray-100"}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{d.client.nom}</p>
                  <p className="text-xs text-gray-400">{d.numero} · {new Date(d.createdAt).toLocaleDateString("fr-FR")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatutBadge statut={d.statut} />
                  <button onClick={() => setConfirmSuppr(d)} className="text-red-300 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400">Validité: {new Date(d.dateValidite).toLocaleDateString("fr-FR")}</p>
                <p className="text-sm font-bold text-gray-900">{devise} {total.toLocaleString()}</p>
              </div>
              <div className="mb-2"><PDFButton type="devis" id={d.id} numero={d.numero} /></div>
              {d.statut === "accepte" && (
                <button onClick={() => convertirCommande(d.id)} className="w-full py-2 rounded-lg bg-green-600 text-white text-xs font-medium">
                  Convertir en commande
                </button>
              )}
              {d.statut !== "accepte" && d.statut !== "confirme" && (
                <div className="flex gap-2">
                  <button onClick={() => fetch("/api/devis/" + d.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut: "envoye" }) }).then(load)}
                    className="flex-1 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 font-medium">
                    Marquer envoyé
                  </button>
                  <button onClick={() => fetch("/api/devis/" + d.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut: "accepte" }) }).then(load)}
                    className="flex-1 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-medium">
                    Accepté ✓
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {devisList.some(d => d.statut === "confirme") && (
          <button onClick={() => setShowConfirmes(v => !v)} className="w-full py-2 text-xs text-gray-400 font-medium">
            {showConfirmes ? "Masquer les devis convertis" : `Voir les devis convertis en commande (${devisList.filter(d => d.statut === "confirme").length})`}
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-24 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Nouveau devis</h2>
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
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Quantité</label>
                      <input type="number" min={1} value={l.quantite || ""}
                        onChange={e => { const nl = [...lignes]; nl[i].quantite = Number(e.target.value); setLignes(nl); }}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-green-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Prix unitaire ({devise})</label>
                      <input type="number" value={l.prixUnit || ""}
                        onChange={e => { const nl = [...lignes]; nl[i].prixUnit = Number(e.target.value); setLignes(nl); }}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-green-500" />
                    </div>
                  </div>
                </div>
              );
            })}
            <button onClick={() => setLignes([...lignes, { briqueId: 0, quantite: 1, prixUnit: 0, description: "" }])} className="text-xs text-green-600 font-medium mb-3">+ Ajouter une ligne</button>

            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">Date de validité</label>
              <input type="date" value={form.dateValidite} onChange={e => setForm(f => ({ ...f, dateValidite: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>

            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Remarques optionnelles..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>

            <div className="bg-green-50 rounded-xl p-3 mb-4 flex justify-between">
              <span className="text-sm text-gray-600">Total devis</span>
              <span className="text-sm font-bold text-green-700">{devise} {totalDevis.toLocaleString()}</span>
            </div>

            <button onClick={save} disabled={!form.clientId || saving}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-40">
              {saving ? "Création…" : "Créer le devis"}
            </button>
          </div>
        </div>
      )}

      {confirmSuppr && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 pb-10">
            <p className="text-base font-semibold text-gray-900 mb-1">Supprimer ce devis ?</p>
            <p className="text-sm text-gray-500 mb-1">{confirmSuppr.numero} — {confirmSuppr.client.nom}</p>
            <p className="text-xs text-red-500 mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSuppr(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700">
                Annuler
              </button>
              <button onClick={supprimerDevis} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-medium">
                Supprimer
              </button>
            </div>
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
