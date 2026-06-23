export const dynamic = "force-dynamic";
"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Wallet, Package, ChevronDown, ChevronUp, Trash2, XCircle } from "lucide-react";

type LigneAchat = { id: number; briqueId: number; quantite: number; prixUnit: number; brique: { nom: string; dimensions: string | null } };
type Achat = { id: number; date: string; notes: string; montantTotal: number; montantVerse: number; statut: string; lignes: LigneAchat[] };
type Versement = { id: number; date: number; montant: number; notes: string };
type Fournisseur = {
  id: number; nom: string; telephone: string; adresse: string; notes: string;
  totalAchats: number; totalVerse: number; totalDu: number;
  achats: Achat[]; versements: Versement[];
};
type BriqueOpt = { id: number; nom: string; dimensions: string | null };
type LigneForm = { briqueId: number; quantite: number; prixUnit: number };

const STATUT_STYLE: Record<string, string> = {
  solde:  "bg-green-100 text-green-700",
  partiel:"bg-yellow-100 text-yellow-700",
  impaye: "bg-red-100 text-red-600",
  annule: "bg-gray-100 text-gray-500",
};
const STATUT_LABEL: Record<string, string> = { solde: "Soldé", partiel: "Partiel", impaye: "Impayé", annule: "Annulé" };

export default function FicheFournisseur() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Fournisseur | null>(null);
  const [briques, setBriques] = useState<BriqueOpt[]>([]);
  const [devise, setDevise] = useState("FCFA");
  const [onglet, setOnglet] = useState<"achats" | "versements">("achats");
  const [openAchatId, setOpenAchatId] = useState<number | null>(null);
  const [confirmAnnuleAchat, setConfirmAnnuleAchat] = useState<Achat | null>(null);
  const [annulErreur, setAnnulErreur] = useState<string | null>(null);

  // Modal achat
  const [showAchat, setShowAchat] = useState(false);
  const [lignes, setLignes] = useState<LigneForm[]>([{ briqueId: 0, quantite: 1, prixUnit: 0 }]);
  const [achatNotes, setAchatNotes] = useState("");
  const [achatDate, setAchatDate] = useState(new Date().toISOString().slice(0, 10));
  const [versImmédiat, setVersImmédiat] = useState(0);
  const [savingAchat, setSavingAchat] = useState(false);
  const savingAchatRef = useRef(false);

  // Modal versement
  const [showVers, setShowVers] = useState(false);
  const [versMontant, setVersMontant] = useState(0);
  const [versNotes, setVersNotes] = useState("");
  const [versDate, setVersDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingVers, setSavingVers] = useState(false);
  const savingVersRef = useRef(false);

  function fmt(n: number) { return devise + " " + n.toLocaleString("fr-FR"); }
  function fmtDate(d: string | number) {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  }

  function load() {
    fetch(`/api/fournisseurs/${id}`).then(r => r.json()).then(setData);
  }

  useEffect(() => {
    fetch("/api/parametres").then(r => r.json()).then(p => { if (p.devise) setDevise(p.devise); });
    fetch("/api/briques").then(r => r.json()).then(setBriques);
    load();
  }, [id]);

  const totalLignes = lignes.reduce((s, l) => s + l.quantite * l.prixUnit, 0);
  const versImmédiaCapped = Math.min(versImmédiat, totalLignes);

  async function saveAchat() {
    if (savingAchatRef.current) return;
    for (const l of lignes) {
      if (!l.briqueId || l.quantite <= 0 || l.prixUnit <= 0) {
        alert("Complétez toutes les lignes (produit, quantité, prix)"); return;
      }
    }
    savingAchatRef.current = true; setSavingAchat(true);
    try {
      const res = await fetch(`/api/fournisseurs/${id}/achat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lignes, notes: achatNotes, date: achatDate, versementImmédiat: versImmédiaCapped }),
      });
      if (!res.ok) { const e = await res.json(); alert(e.error); return; }
      setShowAchat(false);
      setLignes([{ briqueId: 0, quantite: 1, prixUnit: 0 }]);
      setAchatNotes(""); setVersImmédiat(0);
      load();
    } finally { savingAchatRef.current = false; setSavingAchat(false); }
  }

  async function saveVersement() {
    if (savingVersRef.current || versMontant <= 0) return;
    savingVersRef.current = true; setSavingVers(true);
    try {
      const res = await fetch(`/api/fournisseurs/${id}/versement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montant: versMontant, notes: versNotes, date: versDate }),
      });
      if (!res.ok) { const e = await res.json(); alert(e.error); return; }
      setShowVers(false); setVersMontant(0); setVersNotes("");
      load();
    } finally { savingVersRef.current = false; setSavingVers(false); }
  }

  if (!data) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const dettes = data.achats.filter(a => a.statut !== "solde");

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-gray-900 truncate">{data.nom}</h1>
            {data.telephone && <p className="text-xs text-gray-400">{data.telephone}</p>}
          </div>
          <button onClick={() => setShowAchat(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium shrink-0">
            <Plus size={14} /> Achat
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "Total achats", value: data.totalAchats, color: "text-gray-900" },
            { label: "Versé",        value: data.totalVerse,  color: "text-green-600" },
            { label: "Dû",           value: data.totalDu,     color: data.totalDu > 0 ? "text-red-500" : "text-gray-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className={`text-xs font-bold leading-tight ${color}`}>{fmt(value)}</p>
            </div>
          ))}
        </div>

        {/* Bouton versement */}
        {data.totalDu > 0 && (
          <button onClick={() => { setVersMontant(data.totalDu); setShowVers(true); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium">
            <Wallet size={14} />
            Verser — {fmt(data.totalDu)} dû
          </button>
        )}

        {/* Onglets */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mt-3">
          {([["achats", "Achats"], ["versements", "Versements"]] as const).map(([val, label]) => (
            <button key={val} onClick={() => setOnglet(val)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${onglet === val ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Onglet Achats */}
        {onglet === "achats" && (
          <>
            {data.achats.length === 0 && (
              <div className="text-center py-12">
                <Package size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Aucun achat enregistré</p>
              </div>
            )}
            {[...data.achats].reverse().map(a => {
              const open = openAchatId === a.id;
              const resteA = a.montantTotal - a.montantVerse;
              return (
                <div key={a.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <button className="w-full p-4 text-left" onClick={() => setOpenAchatId(open ? null : a.id)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_STYLE[a.statut]}`}>
                            {STATUT_LABEL[a.statut]}
                          </span>
                          <span className="text-xs text-gray-400">{fmtDate(a.date)}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{fmt(a.montantTotal)}</p>
                        {a.statut !== "solde" && (
                          <p className="text-xs text-red-500 mt-0.5">Reste {fmt(resteA)}</p>
                        )}
                        {a.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{a.notes}</p>}
                      </div>
                      {open ? <ChevronUp size={16} className="text-gray-400 mt-1" /> : <ChevronDown size={16} className="text-gray-400 mt-1" />}
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-2">
                      {a.lignes.map(l => (
                        <div key={l.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-700">
                              {l.brique.nom}{l.brique.dimensions ? ` — ${l.brique.dimensions}` : ""}
                            </p>
                            <p className="text-xs text-gray-400">{l.quantite.toLocaleString()} unités × {fmt(l.prixUnit)}</p>
                          </div>
                          <p className="text-xs font-semibold text-gray-900">{fmt(l.quantite * l.prixUnit)}</p>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs font-medium text-gray-500">Versé</span>
                        <span className="text-xs font-semibold text-green-600">{fmt(a.montantVerse)}</span>
                      </div>
                      {a.statut !== "annule" && (
                        <button onClick={() => { setAnnulErreur(null); setConfirmAnnuleAchat(a); }}
                          className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-medium">
                          <XCircle size={13} /> Annuler cet achat
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* Onglet Versements */}
        {onglet === "versements" && (
          <>
            {data.versements.length === 0 && (
              <div className="text-center py-12">
                <Wallet size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Aucun versement effectué</p>
              </div>
            )}
            {data.versements.map(v => (
              <div key={v.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">{fmtDate(v.date)}</p>
                  {v.notes && <p className="text-xs text-gray-500 italic">{v.notes}</p>}
                </div>
                <p className="text-sm font-bold text-green-600">{fmt(v.montant)}</p>
              </div>
            ))}

            {data.versements.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 flex justify-between">
                <span className="text-xs font-medium text-gray-500">Total versé</span>
                <span className="text-sm font-bold text-green-600">{fmt(data.totalVerse)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal confirmation annulation achat */}
      {confirmAnnuleAchat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 pb-10">
            <p className="text-base font-semibold text-gray-900 mb-1">Annuler cet achat ?</p>
            <p className="text-sm text-gray-500 mb-1">Le stock sera décrémenté des quantités achetées.</p>
            {annulErreur && <p className="text-xs text-red-500 mb-3 bg-red-50 rounded-lg p-2">{annulErreur}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setConfirmAnnuleAchat(null); setAnnulErreur(null); }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700">
                Retour
              </button>
              <button onClick={annulerAchat} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-medium">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Achat */}
      {showAchat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end overflow-y-auto" onClick={e => e.target === e.currentTarget && setShowAchat(false)}>
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-sm font-semibold text-gray-900">Nouvel achat</h2>

            <div>
              <label className="text-xs text-gray-500 font-medium">Date</label>
              <input type="date" value={achatDate} onChange={e => setAchatDate(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>

            {/* Lignes produits */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">Produits achetés</p>
                <button onClick={() => setLignes(l => [...l, { briqueId: 0, quantite: 1, prixUnit: 0 }])}
                  className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <Plus size={12} /> Ajouter
                </button>
              </div>

              {lignes.map((l, i) => {
                const incomplete = !l.briqueId || l.quantite <= 0 || l.prixUnit <= 0;
                return (
                  <div key={i} className={`rounded-xl border p-3 space-y-2 ${incomplete ? "border-red-200 bg-red-50" : "border-gray-200"}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-600">Ligne {i + 1}</p>
                      {lignes.length > 1 && (
                        <button onClick={() => setLignes(ls => ls.filter((_, j) => j !== i))}
                          className="text-red-400"><Trash2 size={14} /></button>
                      )}
                    </div>
                    <select value={l.briqueId} onChange={e => {
  const briqueId = Number(e.target.value);
  const existant = lignes.findIndex((x, j) => j !== i && x.briqueId === briqueId);
  if (existant !== -1) {
    setLignes(ls => ls.map((x, j) => j === existant ? { ...x, quantite: x.quantite + ls[i].quantite } : x).filter((_, j) => j !== i));
  } else {
    setLignes(ls => ls.map((x, j) => j === i ? { ...x, briqueId } : x));
  }
}}
                      className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-green-500 bg-white">
                      <option value={0}>Choisir un produit…</option>
                      {briques.map(b => (
                        <option key={b.id} value={b.id}>{b.nom}{b.dimensions ? ` — ${b.dimensions}` : ""}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-400">Quantité</label>
                        <input type="number" min={1} value={l.quantite}
                          onChange={e => setLignes(ls => ls.map((x, j) => j === i ? { ...x, quantite: Number(e.target.value) } : x))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-green-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Prix unitaire</label>
                        <input type="number" min={0} value={l.prixUnit}
                          onChange={e => setLignes(ls => ls.map((x, j) => j === i ? { ...x, prixUnit: Number(e.target.value) } : x))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-green-500" />
                      </div>
                    </div>
                    {l.briqueId > 0 && l.quantite > 0 && l.prixUnit > 0 && (
                      <p className="text-xs text-right font-semibold text-gray-700">{fmt(l.quantite * l.prixUnit)}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {totalLignes > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 flex justify-between">
                <span className="text-xs font-medium text-gray-500">Total à payer</span>
                <span className="text-sm font-bold text-gray-900">{fmt(totalLignes)}</span>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500 font-medium">Verser maintenant (optionnel)</label>
              <input type="number" min={0} max={totalLignes} value={versImmédiat}
                onChange={e => setVersImmédiat(Math.min(Number(e.target.value), totalLignes))}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium">Notes</label>
              <textarea value={achatNotes} onChange={e => setAchatNotes(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none"
                rows={2} placeholder="Notes optionnelles" />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowAchat(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">
                Annuler
              </button>
              <button onClick={saveAchat} disabled={savingAchat}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-medium disabled:opacity-50">
                {savingAchat ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Versement */}
      {showVers && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={e => e.target === e.currentTarget && setShowVers(false)}>
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Versement fournisseur</h2>
            <p className="text-xs text-gray-500">Réparti automatiquement sur les dettes, de la plus ancienne à la plus récente.</p>

            {dettes.length > 0 && (
              <div className="bg-orange-50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-semibold text-orange-700 mb-2">Dettes en cours</p>
                {dettes.map(d => (
                  <div key={d.id} className="flex justify-between">
                    <span className="text-xs text-gray-600">{fmtDate(d.date)}</span>
                    <span className="text-xs font-semibold text-red-500">{fmt(d.montantTotal - d.montantVerse)}</span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500 font-medium">Montant à verser</label>
              <input type="number" min={0} max={data.totalDu} value={versMontant}
                onChange={e => setVersMontant(Math.min(Number(e.target.value), data.totalDu))}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              <p className="text-xs text-gray-400 mt-1">Max : {fmt(data.totalDu)}</p>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium">Date</label>
              <input type="date" value={versDate} onChange={e => setVersDate(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium">Notes</label>
              <input value={versNotes} onChange={e => setVersNotes(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
                placeholder="Optionnel" />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowVers(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">
                Annuler
              </button>
              <button onClick={saveVersement} disabled={savingVers || versMontant <= 0}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white text-sm font-medium disabled:opacity-50">
                {savingVers ? "Enregistrement…" : "Verser"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
