"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRef } from "react";
import { ArrowLeft, Plus, X, RotateCcw } from "lucide-react";
import Link from "next/link";
import PDFButton from "@/components/PDFButton";

type Paiement = { id: number; montant: number; date: string; notes: string };

type Facture = {
  id: number; numero: string; statut: string; dateEmission: string; dateEcheance: string;
  transport: number; notes: string;
  livraison: { commande: { client: { nom: string; telephone: string; adresse: string }; acompte: number }; lignes: { quantiteLivree: number; quantiteCommandee: number; prixUnit: number; brique: { nom: string; dimensions: string | null; prixVente: number } }[] };
  paiements: Paiement[];
};

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = { payee: "bg-green-100 text-green-800", partielle: "bg-yellow-100 text-yellow-800", impayee: "bg-red-100 text-red-800" };
  const labels: Record<string, string> = { payee: "Payé", partielle: "Partiel", impayee: "Impayé" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[statut] ?? "bg-gray-100 text-gray-600"}`}>{labels[statut] ?? statut}</span>;
}

export default function FactureDetail() {
  const { id } = useParams();
  const [facture, setFacture] = useState<Facture | null>(null);
  const [devise, setDevise] = useState("FCFA");
  const [showPaiement, setShowPaiement] = useState(false);
  const [montant, setMontant] = useState(0);
  const [notesPaiement, setNotesPaiement] = useState("");
  const [erreur, setErreur] = useState("");
  const [savingPaiement, setSavingPaiement] = useState(false);
  const [savingAnnul, setSavingAnnul] = useState(false);
  const savingPaiementRef = useRef(false);
  const savingAnnulRef = useRef(false);
  const [confirmAnnuler, setConfirmAnnuler] = useState<Paiement | null>(null);
  const [confirmAnnulAcompte, setConfirmAnnulAcompte] = useState(false);
  const [savingAnnulAcompte, setSavingAnnulAcompte] = useState(false);
  const [filtrePaiement, setFiltrePaiement] = useState<"tous" | "versements" | "annulations">("tous");

  function load() {
    fetch(`/api/factures`).then(r => r.json()).then((fs: Facture[]) => {
      const f = fs.find(f => f.id === Number(id));
      if (f) setFacture(f);
    });
    fetch("/api/parametres").then(r => r.json()).then(p => { if (p.devise) setDevise(p.devise); });
  }
  useEffect(load, [id]);

  if (!facture) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>;

  const sousTotal = facture.livraison.lignes.reduce((s, l) => s + l.quantiteLivree * (l.prixUnit || l.brique.prixVente), 0);
  const total = sousTotal + facture.transport;
  const acompte = facture.livraison.commande.acompte ?? 0;
  const totalPaye = facture.paiements.reduce((s, p) => s + p.montant, 0) + acompte;
  const reste = total - totalPaye;

  async function savePaiement() {
    if (savingPaiementRef.current) return;
    setErreur("");
    if (montant <= 0) return;

    if (montant > reste) {
      setErreur(`Le montant saisi (${devise} ${montant.toLocaleString()}) dépasse la dette restante de ${devise} ${reste.toLocaleString()}.`);
      return;
    }

    savingPaiementRef.current = true; setSavingPaiement(true);
    try {
      const res = await fetch(`/api/factures/${id}/paiement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montant, notes: notesPaiement }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErreur(data.message ?? "Erreur lors de l'enregistrement.");
        return;
      }

      setShowPaiement(false); setMontant(0); setNotesPaiement(""); load();
    } finally { savingPaiementRef.current = false; setSavingPaiement(false); }
  }

  async function annulerPaiement(paiement: Paiement) {
    if (savingAnnulRef.current) return;
    savingAnnulRef.current = true; setSavingAnnul(true);
    try {
      await fetch(`/api/paiements/${paiement.id}/annuler`, { method: "POST" });
      setConfirmAnnuler(null);
      load();
    } finally { savingAnnulRef.current = false; setSavingAnnul(false); }
  }

  async function annulerAcompte() {
    setSavingAnnulAcompte(true);
    try {
      await fetch(`/api/factures/${id}/annuler-acompte`, { method: "POST" });
      setConfirmAnnulAcompte(false);
      load();
    } finally { setSavingAnnulAcompte(false); }
  }

  const isAnnulation = (p: Paiement) => p.montant < 0;

  return (
    <div className="pb-4">
      <div className="bg-white border-b border-gray-200 px-4 py-4 z-10 flex items-center gap-3">
        <Link href="/factures"><ArrowLeft size={20} className="text-gray-500" /></Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-gray-900">{facture.numero}</h1>
          <p className="text-xs text-gray-500">{new Date(facture.dateEmission).toLocaleDateString("fr-FR")}</p>
        </div>
        <StatutBadge statut={facture.statut} />
        <PDFButton type="facture" id={facture.id} numero={facture.numero} />
      </div>

      <div className="p-4 space-y-3">
        {/* Client */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Client</p>
          <p className="text-sm font-semibold text-gray-900">{facture.livraison.commande.client.nom}</p>
          {facture.livraison.commande.client.telephone && <p className="text-xs text-gray-500">{facture.livraison.commande.client.telephone}</p>}
          {facture.livraison.commande.client.adresse && <p className="text-xs text-gray-500">{facture.livraison.commande.client.adresse}</p>}
        </div>

        {/* Articles */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Articles livrés</p>
          {facture.livraison.lignes.map((l, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm text-gray-900">{l.brique.nom}{l.brique.dimensions ? ` — ${l.brique.dimensions}` : ""}</p>
                <p className="text-xs text-gray-400">{devise} {(l.prixUnit || l.brique.prixVente).toLocaleString()}/u</p>
                {l.quantiteLivree < l.quantiteCommandee && (
                  <p className="text-xs text-yellow-600">Commandé: {l.quantiteCommandee} — Livré: {l.quantiteLivree}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">× {l.quantiteLivree}</p>
                <p className="text-sm font-semibold text-gray-900">{devise} {(l.quantiteLivree * (l.prixUnit || l.brique.prixVente)).toLocaleString()}</p>
              </div>
            </div>
          ))}
          <div className="pt-2 space-y-1 mt-1">
            <div className="flex justify-between text-xs text-gray-500"><span>Sous-total</span><span>{devise} {sousTotal.toLocaleString()}</span></div>
            {facture.transport > 0 && <div className="flex justify-between text-xs text-gray-500"><span>Transport</span><span>{devise} {facture.transport.toLocaleString()}</span></div>}
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-100"><span>Total</span><span>{devise} {total.toLocaleString()}</span></div>
          </div>
        </div>

        {/* Paiements */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Historique</p>
            {facture.statut !== "payee" && (
              <button onClick={() => { setMontant(reste); setErreur(""); setShowPaiement(true); }}
                className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <Plus size={12} /> Ajouter
              </button>
            )}
          </div>

          {/* Toggle filtre */}
          {facture.paiements.length > 0 && (
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-3">
              {([["tous", "Tous"], ["versements", "Versements"], ["annulations", "Annulations"]] as const).map(([val, label]) => (
                <button key={val} onClick={() => setFiltrePaiement(val)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${filtrePaiement === val ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Ligne acompte */}
          {acompte > 0 && (
            <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-gray-700">Acompte à la commande</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Acompte</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                <p className="text-sm font-semibold text-green-600">+ {devise} {acompte.toLocaleString()}</p>
                <button onClick={() => setConfirmAnnulAcompte(true)}
                  className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors" title="Annuler l'acompte">
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>
          )}

          {facture.paiements.length === 0 && acompte === 0 && <p className="text-xs text-gray-400">Aucun paiement reçu</p>}

          {(() => {
            // IDs des paiements positifs qui ont été annulés
            const annulesIds = new Set(
              facture.paiements
                .filter(p => p.montant < 0 && p.notes.startsWith("annul:"))
                .map(p => Number(p.notes.split(":")[1].split("|")[0]))
            );

            const paiementsFiltres = facture.paiements.filter(p => {
              if (filtrePaiement === "versements") return p.montant > 0;
              if (filtrePaiement === "annulations") return p.montant < 0;
              return true;
            });

            if (paiementsFiltres.length === 0) {
              return <p className="text-xs text-gray-400 py-2">Aucun élément dans ce filtre.</p>;
            }

            return paiementsFiltres.map((p) => {
              const estAnnulation = p.montant < 0;
              const estRetourne = !estAnnulation && annulesIds.has(p.id);
              // Notes affichables : on retire le préfixe technique "annul:ID|"
              const notesAffichees = estAnnulation && p.notes.startsWith("annul:")
                ? p.notes.split("|").slice(1).join("|")
                : p.notes;

              return (
                <div key={p.id} className={`flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 ${estAnnulation ? "opacity-70" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-medium text-gray-700">
                        {new Date(p.date).toLocaleDateString("fr-FR")}
                      </p>
                      {estRetourne && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">Retourné</span>
                      )}
                      {estAnnulation && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Annulation</span>
                      )}
                    </div>
                    {notesAffichees && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{notesAffichees}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <p className={`text-sm font-semibold ${estAnnulation ? "text-red-500" : estRetourne ? "text-orange-500 line-through" : "text-green-600"}`}>
                      {estAnnulation ? "−" : "+"} {devise} {Math.abs(p.montant).toLocaleString()}
                    </p>
                    {!estAnnulation && !estRetourne && (
                      <button
                        onClick={() => setConfirmAnnuler(p)}
                        className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                        title="Annuler ce paiement"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            });
          })()}

          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Total encaissé net</span>
              <span className="text-green-600 font-medium">{devise} {Math.max(0, totalPaye).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Reste à payer</span>
              <span className={reste > 0 ? "text-red-600" : "text-green-600"}>{devise} {Math.max(0, reste).toLocaleString()}</span>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded mt-3">
            <div className="h-2 bg-green-500 rounded transition-all" style={{ width: `${total > 0 ? Math.min((totalPaye / total) * 100, 100) : 0}%` }} />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-3 text-xs text-yellow-700">
          Échéance : {new Date(facture.dateEcheance).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Modal ajout paiement */}
      {showPaiement && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-24 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Enregistrer un paiement</h2>
              <button onClick={() => { setShowPaiement(false); setErreur(""); }}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Reste à payer</p>
              <p className="text-lg font-bold text-red-600">{devise} {reste.toLocaleString()}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Montant reçu ({devise})</label>
              <input
                type="number"
                value={montant || ""}
                onChange={e => { setMontant(Number(e.target.value)); setErreur(""); }}
                className={`w-full border rounded-lg px-3 py-2.5 text-lg font-semibold focus:outline-none ${erreur ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-green-500"}`}
              />
              {erreur && (
                <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <span className="text-red-500 text-sm mt-0.5">⚠</span>
                  <p className="text-xs text-red-600 font-medium">{erreur}</p>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Note (optionnel)</label>
              <input value={notesPaiement} onChange={e => setNotesPaiement(e.target.value)} placeholder="Ex: Virement, espèces..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>
            <button onClick={savePaiement} disabled={montant <= 0 || savingPaiement}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-40">
              {savingPaiement ? "Enregistrement…" : "Confirmer le paiement"}
            </button>
          </div>
        </div>
      )}

      {/* Modal confirmation annulation */}
      {confirmAnnuler && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-24 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Annuler ce paiement ?</h2>
              <button onClick={() => setConfirmAnnuler(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Paiement du {new Date(confirmAnnuler.date).toLocaleDateString("fr-FR")}</p>
              <p className="text-xl font-bold text-red-600">− {devise} {confirmAnnuler.montant.toLocaleString()}</p>
              {confirmAnnuler.notes && <p className="text-xs text-gray-400 mt-1">{confirmAnnuler.notes}</p>}
            </div>
            <p className="text-xs text-gray-500 text-center">
              Un paiement négatif sera enregistré dans l&apos;historique pour garder la traçabilité.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmAnnuler(null)}
                className="py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">
                Garder
              </button>
              <button onClick={() => annulerPaiement(confirmAnnuler)} disabled={savingAnnul}
                className="py-3 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-60">
                {savingAnnul ? "Annulation…" : "Oui, annuler"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal annulation acompte */}
      {confirmAnnulAcompte && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-24 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Annuler l&apos;acompte ?</h2>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Acompte à annuler</p>
              <p className="text-xl font-bold text-red-600">− {devise} {acompte.toLocaleString()}</p>
            </div>
            <p className="text-xs text-gray-500">
              L&apos;acompte sera retiré et la facture sera mise à jour en conséquence.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmAnnulAcompte(false)}
                className="py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">
                Garder
              </button>
              <button onClick={annulerAcompte} disabled={savingAnnulAcompte}
                className="py-3 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-60">
                {savingAnnulAcompte ? "Annulation…" : "Oui, annuler"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
