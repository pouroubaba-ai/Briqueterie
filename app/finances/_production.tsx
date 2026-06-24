"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, ChevronDown, ChevronUp, X, Hammer, Trash2, Ban, Wallet } from "lucide-react";

type ProdBrique = { id: number; nombreSacs: number; prixParSac: number; quantiteAjoutee: number; brique: { nom: string; dimensions: string | null } };
type Production = { id: number; date: string; totalSacs: number; montantDu: number; montantVerse: number; statut: string; notes: string; briques: ProdBrique[] };
type Brique = { id: number; nom: string; dimensions: string | null; stockActuel: number; estCiment: boolean };
type LigneProd = { briqueId: number; nombreSacs: number; prixParSac: number; quantiteAjoutee: number; soustraireCiment: boolean | null };
type RepartitionLigne = { prod: Production; montant: number };
type VersGroupeLigne = { id: number; montant: number; productionJour: { id: number; date: string; montantDu: number } };
type VersGroupe = { id: number; date: string; montantTotal: number; annule: boolean; notes: string; lignes: VersGroupeLigne[] };

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = { solde: "bg-green-100 text-green-800", partiel: "bg-yellow-100 text-yellow-800", impaye: "bg-red-100 text-red-800", annule: "bg-gray-100 text-gray-500" };
  const labels: Record<string, string> = { solde: "Soldé", partiel: "Partiel", impaye: "Impayé", annule: "Annulée" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[statut] ?? "bg-gray-100 text-gray-600"}`}>{labels[statut] ?? statut}</span>;
}
function ligneComplete(l: LigneProd) { return l.briqueId > 0 && l.nombreSacs > 0 && l.quantiteAjoutee > 0 && l.prixParSac > 0; }
function calculerRepartition(productions: Production[], montantTotal: number): RepartitionLigne[] {
  const dettes = productions.filter(p => p.statut !== "annule" && p.statut !== "solde").sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let restant = montantTotal;
  const lignes: RepartitionLigne[] = [];
  for (const p of dettes) {
    if (restant <= 0) break;
    const m = Math.min(p.montantDu - p.montantVerse, restant);
    if (m > 0) { lignes.push({ prod: p, montant: m }); restant -= m; }
  }
  return lignes;
}

export default function ProductionTab({ devise }: { devise: string }) {
  const [productions, setProductions] = useState<Production[]>([]);
  const [briques, setBriques] = useState<Brique[]>([]);
  const [onglet, setOnglet] = useState<"productions" | "versements">("productions");
  const [periode, setPeriode] = useState<"jour"|"semaine"|"mois"|"annee"|"custom">("mois");
  const [customDe, setCustomDe] = useState(new Date().toISOString().slice(0, 10));
  const [customA, setCustomA] = useState(new Date().toISOString().slice(0, 10));
  const [showAnnulees, setShowAnnulees] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState<string>("tout");
  const [openId, setOpenId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [lignes, setLignes] = useState<LigneProd[]>([{ briqueId: 0, nombreSacs: 0, prixParSac: 0, quantiteAjoutee: 0, soustraireCiment: null }]);
  const [stockCiment, setStockCiment] = useState<number | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [montantVerseImmediat, setMontantVerseImmediat] = useState(0);
  const [formErreur, setFormErreur] = useState("");
  const [showVersement, setShowVersement] = useState<Production | null>(null);
  const [versement, setVersement] = useState(0);
  const [versErreur, setVersErreur] = useState("");
  const [versGroupes, setVersGroupes] = useState<VersGroupe[]>([]);
  const [openGroupeId, setOpenGroupeId] = useState<number | null>(null);
  const [showVersGroupé, setShowVersGroupé] = useState(false);
  const [versGroupé, setVersGroupé] = useState(0);
  const [versGroupéDétail, setVersGroupéDétail] = useState(false);
  const [savingVersGroupé, setSavingVersGroupé] = useState(false);
  const [confirmAnnul, setConfirmAnnul] = useState<Production | null>(null);
  const [annulling, setAnnulling] = useState(false);
  const [annulError, setAnnulError] = useState("");
  const [savingProd, setSavingProd] = useState(false);
  const [savingVers, setSavingVers] = useState(false);
  const savingProdRef = useRef(false);
  const savingVersRef = useRef(false);
  const savingVersGroupéRef = useRef(false);

  function getRange() {
    const now = new Date();
    if (periode === "jour") { const d = now.toISOString().slice(0, 10); return { de: d, a: d }; }
    if (periode === "semaine") {
      const day = now.getDay() || 7; const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { de: mon.toISOString().slice(0, 10), a: sun.toISOString().slice(0, 10) };
    }
    if (periode === "mois") {
      const de = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      return { de, a: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10) };
    }
    if (periode === "annee") return { de: `${now.getFullYear()}-01-01`, a: `${now.getFullYear()}-12-31` };
    return { de: customDe, a: customA };
  }

  function load() {
    const { de, a } = getRange();
    fetch(`/api/production?de=${de}&a=${a}`).then(r => r.json()).then(setProductions);
    fetch("/api/production/versement-groupe").then(r => r.json()).then(setVersGroupes);
    fetch("/api/briques").then(r => r.json()).then((liste: Brique[]) => {
      setBriques(liste);
      const ciment = liste.find(b => b.estCiment);
      setStockCiment(ciment ? ciment.stockActuel : null);
    });
  }
  useEffect(load, [periode, customDe, customA]);

  async function save() {
    if (savingProdRef.current) return;
    const lignesRemplies = lignes.filter(l => l.briqueId > 0 || l.nombreSacs > 0 || l.quantiteAjoutee > 0 || l.prixParSac > 0);
    if (lignesRemplies.length === 0) { setFormErreur("Ajoutez au moins une ligne de production."); return; }
    if (lignesRemplies.some(l => !ligneComplete(l))) { setFormErreur("Chaque ligne doit être complète."); return; }
    if (lignesRemplies.some(l => l.soustraireCiment === null)) { setFormErreur("Indiquez si le ciment est utilisé pour chaque ligne."); return; }
    const totalSacsCiment = lignesRemplies.filter(l => l.soustraireCiment).reduce((s, l) => s + l.nombreSacs, 0);
    if (totalSacsCiment > 0 && stockCiment !== null && totalSacsCiment > stockCiment) {
      setFormErreur(`Stock de ciment insuffisant — vous utilisez ${totalSacsCiment} sac(s) mais il n'en reste que ${stockCiment}.`);
      return;
    }
    setFormErreur(""); savingProdRef.current = true; setSavingProd(true);
    try {
      const res = await fetch("/api/production", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, briques: lignesRemplies, notes, montantVerse: montantVerseImmediat > 0 ? montantVerseImmediat : undefined }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setFormErreur(err.error || "Erreur serveur"); return; }
      setShowForm(false); setLignes([{ briqueId: 0, nombreSacs: 0, prixParSac: 0, quantiteAjoutee: 0, soustraireCiment: null }]); setNotes(""); setFormErreur(""); setMontantVerseImmediat(0); load();
    } finally { savingProdRef.current = false; setSavingProd(false); }
  }

  async function saveVersement() {
    if (savingVersRef.current || !showVersement || versement <= 0) return;
    const reste = showVersement.montantDu - showVersement.montantVerse;
    if (versement > reste) { setVersErreur(`Maximum : ${reste.toLocaleString()} ${devise}`); return; }
    setVersErreur(""); savingVersRef.current = true; setSavingVers(true);
    try {
      const res = await fetch(`/api/production/${showVersement.id}/versement`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ montant: versement }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setVersErreur(err.error || "Erreur"); return; }
      setShowVersement(null); setVersement(0); setVersErreur(""); load();
    } finally { savingVersRef.current = false; setSavingVers(false); }
  }

  async function saveVersementGroupé() {
    if (savingVersGroupéRef.current || versGroupé <= 0) return;
    savingVersGroupéRef.current = true; setSavingVersGroupé(true);
    try {
      const res = await fetch("/api/production/versement-groupe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ montantTotal: versGroupé }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error || "Erreur"); return; }
      setShowVersGroupé(false); setVersGroupé(0); setVersGroupéDétail(false); load();
    } finally { savingVersGroupéRef.current = false; setSavingVersGroupé(false); }
  }

  async function annulerProduction() {
    if (!confirmAnnul || annulling) return;
    setAnnulling(true);
    setAnnulError("");
    try {
      const res = await fetch(`/api/production/${confirmAnnul.id}/annuler`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAnnulError(err.error || "Erreur lors de l'annulation.");
        return;
      }
      setConfirmAnnul(null); setOpenId(null); load();
    } finally { setAnnulling(false); }
  }

  const producsActives = productions.filter(p => p.statut !== "annule");
  const totalDu = producsActives.reduce((s, p) => s + p.montantDu, 0);
  const totalVerse = producsActives.reduce((s, p) => s + p.montantVerse, 0);
  const resteAVerser = totalDu - totalVerse;
  const nbDettes = productions.filter(p => p.statut === "impaye" || p.statut === "partiel").length;
  const productionsFiltrees = productions.filter(p => { if (!showAnnulees && p.statut === "annule") return false; if (filtreStatut !== "tout" && p.statut !== filtreStatut) return false; return true; });
  const versementsIndividuels = [...productions].filter(p => p.montantVerse > 0 || p.statut === "annule").sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const repartitionPreview = versGroupé > 0 ? calculerRepartition(productions, versGroupé) : [];
  const montantCouvert = repartitionPreview.reduce((s, l) => s + l.montant, 0);

  return (
    <div className="pb-4">
      {/* Contrôles */}
      <div className="bg-white border-b border-gray-100 px-4 pt-3 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-1 mr-3">
            {([["productions","Productions"],["versements","Versements"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setOnglet(val)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${onglet === val ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>{label}</button>
            ))}
          </div>
          <button onClick={() => { setShowForm(true); setFormErreur(""); }} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium shrink-0">
            <Plus size={13} /> Saisir
          </button>
        </div>
        {onglet === "productions" && (
          <div className="flex gap-2 mt-1">
            <div className="flex-1">
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
                <div className="flex gap-1.5 mt-1.5">
                  <input type="date" value={customDe} onChange={e => setCustomDe(e.target.value)} className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
                  <span className="text-xs text-gray-400 self-center">→</span>
                  <input type="date" value={customA} onChange={e => setCustomA(e.target.value)} className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
                </div>
              )}
            </div>
            <div className="flex gap-1.5">
              <select
                value={filtreStatut}
                onChange={e => setFiltreStatut(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:border-green-500"
              >
                <option value="tout">Tout</option>
                <option value="solde">Soldé</option>
                <option value="partiel">Partiel</option>
                <option value="impaye">Impayé</option>
              </select>
              <button
                onClick={() => setShowAnnulees(s => !s)}
                className={`text-xs px-2.5 py-2 rounded-lg border font-medium transition-all ${showAnnulees ? "bg-gray-200 text-gray-700 border-gray-300" : "bg-white text-gray-400 border-gray-200"}`}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {onglet === "productions" && <>
        {producsActives.length > 0 && (
          <div className="px-4 pt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {[{label:"Total dû",value:totalDu,color:"text-gray-900"},{label:"Versé",value:totalVerse,color:"text-green-600"},{label:"Reste",value:resteAVerser,color:"text-red-600"}].map(({label,value,color}) => (
                <div key={label} className="bg-white rounded-xl border border-gray-100 p-2.5"><p className="text-xs text-gray-400">{label}</p><p className={`text-xs font-bold ${color}`}>{devise} {value.toLocaleString()}</p></div>
              ))}
            </div>
            {nbDettes >= 2 && (
              <button onClick={() => { setShowVersGroupé(true); setVersGroupé(0); setVersGroupéDétail(false); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-green-200 bg-green-50 text-green-700 text-xs font-medium">
                <Wallet size={13} /> Versement groupé · {nbDettes} jours · {devise} {resteAVerser.toLocaleString()} dû
              </button>
            )}
          </div>
        )}
        <div className="px-4 pt-3 space-y-2">
          {productionsFiltrees.length === 0 && (
            <div className="text-center py-10"><Hammer size={36} className="text-gray-200 mx-auto mb-2" /><p className="text-gray-400 text-sm">Aucune production sur cette période</p></div>
          )}
          {productionsFiltrees.map(p => {
            const annulee = p.statut === "annule";
            return (
              <div key={p.id} className={`bg-white rounded-xl border ${annulee ? "border-gray-100 opacity-60" : "border-gray-100"}`}>
                <button onClick={() => setOpenId(openId === p.id ? null : p.id)} className="w-full flex items-center gap-2 px-4 py-3 text-left">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${annulee ? "line-through text-gray-400" : "text-gray-900"}`}>{new Date(p.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "long" })}</span>
                      <StatutBadge statut={p.statut} />
                    </div>
                    {!annulee && <div className="grid grid-cols-4 gap-1 text-xs"><span className="text-gray-500">{p.totalSacs} sacs</span><span className="text-gray-700">Dû: {(p.montantDu/1000).toFixed(0)}K</span><span className="text-green-600">Versé: {(p.montantVerse/1000).toFixed(0)}K</span><span className="text-red-600">Reste: {((p.montantDu-p.montantVerse)/1000).toFixed(0)}K</span></div>}
                  </div>
                  {openId === p.id ? <ChevronUp size={15} className="text-gray-300 shrink-0" /> : <ChevronDown size={15} className="text-gray-300 shrink-0" />}
                </button>
                {openId === p.id && (
                  <div className="border-t border-gray-50 px-4 py-3 bg-green-50">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Détail</p>
                    {p.briques.map(b => (
                      <div key={b.id} className="flex justify-between text-xs py-1.5 border-b border-green-100 last:border-0">
                        <span className="text-gray-600">{b.brique.nom}{b.brique.dimensions ? ` — ${b.brique.dimensions}` : ""}</span>
                        <span className="text-gray-500">{b.nombreSacs} sacs · {b.quantiteAjoutee} unités · {b.prixParSac.toLocaleString()} {devise}/sac</span>
                      </div>
                    ))}
                    {p.notes && <p className="text-xs text-gray-400 mt-2 italic">{p.notes}</p>}
                    {!annulee && (
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-green-200 gap-2">
                        <span className="text-xs text-gray-500">Reste : <span className="font-bold text-red-600">{devise} {Math.max(0, p.montantDu - p.montantVerse).toLocaleString()}</span></span>
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmAnnul(p)} className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"><Ban size={11} /> Annuler</button>
                          {p.statut !== "solde" && <button onClick={() => { setShowVersement(p); setVersement(Math.max(0, p.montantDu - p.montantVerse)); setVersErreur(""); }} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium">+ Verser</button>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>}

      {onglet === "versements" && (
        <div className="px-4 pt-3 space-y-2">
          {versementsIndividuels.length === 0 && versGroupes.length === 0 && (
            <div className="text-center py-10"><Wallet size={36} className="text-gray-200 mx-auto mb-2" /><p className="text-gray-400 text-sm">Aucun versement</p></div>
          )}

          {/* Versements groupés — extensibles */}
          {versGroupes.map(g => (
            <div key={g.id} className="bg-white rounded-xl border border-gray-100">
              <button onClick={() => setOpenGroupeId(openGroupeId === g.id ? null : g.id)} className="w-full flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">{new Date(g.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })} · {g.lignes.length} journée(s)</p>
                  <p className="text-sm font-semibold text-gray-900">{devise} {g.montantTotal.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">Groupé</span>
                  {openGroupeId === g.id ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />}
                </div>
              </button>
              {openGroupeId === g.id && (
                <div className="border-t border-gray-50 px-4 py-3 bg-blue-50 space-y-1.5">
                  {g.lignes.map(l => (
                    <div key={l.id} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{new Date(l.productionJour.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "long" })}</span>
                      <span className="text-xs font-semibold text-blue-700">{devise} {l.montant.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Versements individuels — dans la même liste */}
          {versementsIndividuels.map(p => (
            <div key={p.id} className={`bg-white rounded-xl border border-gray-100 p-4 ${p.statut === "annule" ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">{new Date(p.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                  <p className={`text-sm font-semibold ${p.statut === "annule" ? "line-through text-gray-400" : "text-gray-900"}`}>{devise} {p.montantVerse.toLocaleString()}</p>
                  {p.statut === "annule" && <p className="text-xs text-red-500 mt-0.5">Annulé</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatutBadge statut={p.statut} />
                  <span className="text-xs text-gray-400">sur {devise} {p.montantDu.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-24 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h2 className="text-base font-semibold">Saisir une journée</h2><button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button></div>
            <div className="mb-3"><label className="text-xs text-gray-500 mb-1 block">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" /></div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Produits fabriqués</p>
            {lignes.map((l, i) => {
              const parSac = l.nombreSacs > 0 && l.quantiteAjoutee > 0 ? (l.quantiteAjoutee / l.nombreSacs).toFixed(1) : null;
              const incomplete = (l.briqueId > 0 || l.nombreSacs > 0 || l.quantiteAjoutee > 0 || l.prixParSac > 0) && !ligneComplete(l);
              return (
                <div key={i} className={`mb-3 p-3 rounded-xl ${incomplete ? "bg-red-50 border border-red-100" : "bg-gray-50"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <select value={l.briqueId} onChange={e => {
  const briqueId = Number(e.target.value);
  const existant = lignes.findIndex((x, j) => j !== i && x.briqueId === briqueId);
  if (existant !== -1) {
    setLignes(ls => ls.map((x, j) => j === existant ? { ...x, quantiteAjoutee: x.quantiteAjoutee + ls[i].quantiteAjoutee, nombreSacs: x.nombreSacs + ls[i].nombreSacs } : x).filter((_, j) => j !== i));
  } else {
    const nl=[...lignes]; nl[i].briqueId=briqueId; setLignes(nl);
  }
}} className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-green-500 bg-white"><option value={0}>Produit…</option>{briques.map(b => <option key={b.id} value={b.id}>{b.nom}{b.dimensions ? ` — ${b.dimensions}` : ""}</option>)}</select>
                    <button onClick={() => setLignes(lignes.filter((_,j)=>j!==i))} className="p-1.5 text-gray-300 hover:text-red-400"><Trash2 size={14}/></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {([["nombreSacs","Sacs"],["quantiteAjoutee","Total produit"],["prixParSac","Prix/sac"]] as const).map(([key,lbl]) => (
                      <div key={key}><label className="text-xs text-gray-400 mb-1 block">{lbl} <span className="text-red-400">*</span></label><input type="number" placeholder="0" value={l[key]||""} min={0} onChange={e => { const nl=[...lignes]; nl[i]={...nl[i],[key]:Number(e.target.value)}; setLignes(nl); }} className={`w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-green-500 bg-white ${!l[key] && incomplete ? "border-red-300" : "border-gray-200"}`}/></div>
                    ))}
                  </div>
                  <div className="mt-1 pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-500 font-medium">Sacs de ciment utilisés ?</span>
                      {stockCiment !== null && (
                        <span className={`text-xs font-medium ${l.soustraireCiment && l.nombreSacs > stockCiment ? "text-red-500" : "text-gray-400"}`}>
                          Stock : {stockCiment} sac{stockCiment !== 1 ? "s" : ""}
                          {l.soustraireCiment && l.nombreSacs > stockCiment ? " ⚠ insuffisant" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button type="button"
                        disabled={stockCiment === null}
                        onClick={() => { const nl=[...lignes]; nl[i].soustraireCiment=true; setLignes(nl); }}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${l.soustraireCiment === true ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-500 border-gray-200"}`}>
                        {stockCiment === null ? "Oui (aucun ciment configuré)" : "Oui — déduire du stock"}
                      </button>
                      <button type="button"
                        onClick={() => { const nl=[...lignes]; nl[i].soustraireCiment=false; setLignes(nl); }}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${l.soustraireCiment === false ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-500 border-gray-200"}`}>
                        Non
                      </button>
                    </div>
                  </div>
                  {parSac && <p className="text-xs text-green-600 mt-1.5">→ {parSac} unités/sac · {l.quantiteAjoutee.toLocaleString()} ajoutées au stock</p>}
                </div>
              );
            })}
            <button onClick={() => { setLignes([...lignes,{briqueId:0,nombreSacs:0,prixParSac:0,quantiteAjoutee:0,soustraireCiment:null}]); setFormErreur(""); }} className="text-xs text-green-600 font-medium mb-4 flex items-center gap-1"><Plus size={12}/> Ajouter une ligne</button>
            <div className="mb-3"><label className="text-xs text-gray-500 mb-1 block">Notes</label><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Remarques…" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"/></div>
            {(() => {
              const totalProd = lignes.reduce((s,l) => s+l.nombreSacs*l.prixParSac, 0);
              return (<>{totalProd > 0 && <div className="mb-3 p-3 bg-gray-50 rounded-xl flex items-center justify-between"><span className="text-xs text-gray-500 font-medium">Total à payer</span><span className="text-base font-bold text-gray-900">{devise} {totalProd.toLocaleString()}</span></div>}<div className="mb-4 p-3 bg-green-50 rounded-xl border border-green-100"><label className="text-xs text-green-700 font-medium mb-1 block">Verser maintenant</label><input type="number" placeholder="0" value={montantVerseImmediat||""} min={0} max={totalProd||undefined} onChange={e=>setMontantVerseImmediat(Math.min(Number(e.target.value),totalProd||Infinity))} className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white"/></div></>);
            })()}
            {formErreur && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{formErreur}</p>}
            <button onClick={save} disabled={savingProd} className="w-full bg-green-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-60">{savingProd ? "Enregistrement…" : "Enregistrer la journée"}</button>
          </div>
        </div>
      )}

      {showVersement && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-24">
            <div className="flex items-center justify-between mb-4"><h2 className="text-base font-semibold">Versement</h2><button onClick={()=>{setShowVersement(null);setVersErreur("");}}><X size={20} className="text-gray-400"/></button></div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4"><p className="text-xs text-gray-500">Journée du {new Date(showVersement.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"long"})}</p><p className="text-sm font-semibold mt-1">Reste : <span className="text-red-600">{devise} {Math.max(0,showVersement.montantDu-showVersement.montantVerse).toLocaleString()}</span></p></div>
            <div className="mb-1"><label className="text-xs text-gray-500 mb-1 block">Montant ({devise})</label><input type="number" value={versement} max={showVersement.montantDu-showVersement.montantVerse} onChange={e=>{setVersement(Number(e.target.value));setVersErreur("");}} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 text-lg font-semibold"/></div>
            {versErreur && <p className="text-xs text-red-600 mb-1">{versErreur}</p>}
            <p className="text-xs text-gray-400 mb-4">Max : {devise} {Math.max(0,showVersement.montantDu-showVersement.montantVerse).toLocaleString()}</p>
            <button onClick={saveVersement} disabled={savingVers||versement<=0} className="w-full bg-green-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-60">{savingVers?"Enregistrement…":"Confirmer"}</button>
          </div>
        </div>
      )}

      {showVersGroupé && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-24 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h2 className="text-base font-semibold">Versement groupé</h2><button onClick={()=>{setShowVersGroupé(false);setVersGroupé(0);setVersGroupéDétail(false);}}><X size={20} className="text-gray-400"/></button></div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4 text-xs text-orange-700">Restant dû : <span className="font-bold">{devise} {resteAVerser.toLocaleString()}</span>. Réparti du plus ancien au plus récent.</div>
            <div className="mb-3"><label className="text-xs text-gray-500 mb-1 block">Montant ({devise})</label><input type="number" placeholder="0" value={versGroupé||""} min={0} max={resteAVerser} onChange={e=>setVersGroupé(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-lg font-semibold focus:outline-none focus:border-green-500"/></div>
            {repartitionPreview.length > 0 && <div className="mb-4"><button onClick={()=>setVersGroupéDétail(s=>!s)} className="flex items-center gap-1 text-xs text-gray-500 font-medium mb-2">{versGroupéDétail?<ChevronUp size={13}/>:<ChevronDown size={13}/>} Répartition ({repartitionPreview.length} journée{repartitionPreview.length>1?"s":""})</button>{versGroupéDétail && <div className="space-y-1.5">{repartitionPreview.map(({prod,montant}) => (<div key={prod.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"><span className="text-xs text-gray-600">{new Date(prod.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}</span><span className="text-xs font-semibold text-green-700">+ {devise} {montant.toLocaleString()}</span></div>))}</div>}</div>}
            <button onClick={saveVersementGroupé} disabled={savingVersGroupé||versGroupé<=0||repartitionPreview.length===0} className="w-full bg-green-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-60">{savingVersGroupé?"En cours…":`Confirmer — ${devise} ${Math.min(versGroupé,montantCouvert).toLocaleString()}`}</button>
          </div>
        </div>
      )}

      {confirmAnnul && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-24">
            <div className="flex items-center justify-between mb-4"><h2 className="text-base font-semibold">Annuler la production ?</h2><button onClick={()=>setConfirmAnnul(null)}><X size={20} className="text-gray-400"/></button></div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4 text-sm text-red-700 space-y-1"><p className="font-medium">Cette action va :</p><p>• Retirer les unités produites du stock</p>{confirmAnnul.montantVerse>0 && <p>• Annuler le versement de {devise} {confirmAnnul.montantVerse.toLocaleString()}</p>}</div>
            {annulError && <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-300 rounded-xl text-sm text-red-700 mb-3"><span className="shrink-0">⚠</span><span>{annulError}</span></div>}
            <div className="flex gap-3"><button onClick={()=>{setConfirmAnnul(null);setAnnulError("");}} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium text-sm">Garder</button><button onClick={annulerProduction} disabled={annulling} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-60">{annulling?"Annulation…":"Confirmer"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
