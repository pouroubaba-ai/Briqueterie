"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Truck, FileText, XCircle, X } from "lucide-react";
import Link from "next/link";
import PDFButton from "@/components/PDFButton";

type Commande = {
  id: number; numero: string; statut: string; createdAt: string;
  acompte: number; transport: number; notes: string; dateLivraisonPrevue: string | null;
  client: { nom: string; telephone: string; adresse: string };
  lignes: { id: number; quantite: number; prixUnit: number; briqueId: number; brique: { nom: string; dimensions: string | null; stockActuel: number } }[];
  livraison: { id: number } | null;
  devis: { id: number; numero: string; dateValidite: string; notes: string; statut: string; lignes: { quantite: number; prixUnit: number; brique: { nom: string; dimensions: string | null } }[] } | null;
};

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = { en_attente: "bg-yellow-100 text-yellow-800", confirme: "bg-blue-100 text-blue-800", livre: "bg-green-100 text-green-800", annule: "bg-red-100 text-red-800" };
  const labels: Record<string, string> = { en_attente: "En attente", confirme: "Confirmé", livre: "Livré", annule: "Annulé" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[statut] ?? "bg-gray-100 text-gray-600"}`}>{labels[statut] ?? statut}</span>;
}

export default function CommandeDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [commande, setCommande] = useState<Commande | null>(null);
  const [devise, setDevise] = useState("FCFA");
  const [erreurLivraison, setErreurLivraison] = useState<string | null>(null);
  const [confirmAnnulation, setConfirmAnnulation] = useState(false);
  const [showDevis, setShowDevis] = useState(false);

  useEffect(() => {
    fetch(`/api/commandes/${id}`).then(r => r.json()).then(setCommande);
    fetch("/api/parametres").then(r => r.json()).then(p => { if (p.devise) setDevise(p.devise); });
  }, [id]);

  if (!commande) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>;

  const sousTotal = commande.lignes.reduce((s, l) => s + l.quantite * l.prixUnit, 0);
  const total = sousTotal + commande.transport;

  async function annulerCommande() {
    await fetch(`/api/commandes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut: "annule" }) });
    setConfirmAnnulation(false);
    fetch(`/api/commandes/${id}`).then(r => r.json()).then(setCommande);
  }

  async function creerLivraison() {
    setErreurLivraison(null);
    const lignesPayload = commande!.lignes.map(l => ({ briqueId: l.briqueId, quantiteCommandee: l.quantite, quantiteLivree: l.quantite }));
    const res = await fetch("/api/livraisons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commandeId: commande!.id, dateLivraison: new Date().toISOString(), lignes: lignesPayload }),
    });
    if (!res.ok) {
      const err = await res.json();
      setErreurLivraison(err.message ?? "Erreur lors de la création de la livraison");
      return;
    }
    router.push("/livraisons");
  }

  return (
    <div className="pb-4">
      <div className="bg-white border-b border-gray-200 px-4 py-4 z-10 flex items-center gap-3">
        <Link href="/commandes"><ArrowLeft size={20} className="text-gray-500" /></Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-gray-900">{commande.numero}</h1>
          <p className="text-xs text-gray-500">{new Date(commande.createdAt).toLocaleDateString("fr-FR")}</p>
        </div>
        <StatutBadge statut={commande.statut} />
        <PDFButton type="commande" id={commande.id} numero={commande.numero} />
      </div>

      <div className="p-4 space-y-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Client</p>
          <p className="text-sm font-semibold text-gray-900">{commande.client.nom}</p>
          {commande.client.telephone && <p className="text-xs text-gray-500">{commande.client.telephone}</p>}
          {commande.client.adresse && <p className="text-xs text-gray-500">{commande.client.adresse}</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Articles</p>
          {commande.lignes.map((l, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm text-gray-900">{l.brique.nom}{l.brique.dimensions ? ` — ${l.brique.dimensions}` : ""}</p>
                <p className="text-xs text-gray-400">{devise} {l.prixUnit.toLocaleString()}/u</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">× {l.quantite}</p>
                <p className="text-sm font-semibold text-gray-900">{devise} {(l.quantite * l.prixUnit).toLocaleString()}</p>
              </div>
            </div>
          ))}
          <div className="pt-2 space-y-1">
            <div className="flex justify-between text-xs text-gray-500"><span>Sous-total</span><span>{devise} {sousTotal.toLocaleString()}</span></div>
            {commande.transport > 0 && <div className="flex justify-between text-xs text-gray-500"><span>Transport</span><span>{devise} {commande.transport.toLocaleString()}</span></div>}
            {commande.acompte > 0 && <div className="flex justify-between text-xs text-green-600"><span>Acompte reçu</span><span>− {devise} {commande.acompte.toLocaleString()}</span></div>}
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-100">
              <span>Net à payer</span><span>{devise} {(total - commande.acompte).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {commande.dateLivraisonPrevue && (
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 text-xs text-blue-700">
            Livraison prévue le {new Date(commande.dateLivraisonPrevue).toLocaleDateString("fr-FR")}
          </div>
        )}

        {commande.notes && <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 italic">{commande.notes}</div>}

        {erreurLivraison && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{erreurLivraison}</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {commande.devis ? (
            <button onClick={() => setShowDevis(true)} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700">
              <FileText size={16} /> Voir devis
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-400">
              <FileText size={16} /> Aucun devis
            </div>
          )}
          {!commande.livraison && commande.statut !== "livre" && commande.statut !== "annule" && (
            <button onClick={creerLivraison} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white text-sm font-medium">
              <Truck size={16} /> Créer livraison
            </button>
          )}
          {commande.livraison && (
            <Link href={`/livraisons/${commande.livraison.id}`} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white text-sm font-medium">
              <Truck size={16} /> Voir livraison
            </Link>
          )}
        </div>

        {commande.statut === "en_attente" && (
          <button onClick={() => setConfirmAnnulation(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-600 text-sm font-medium">
            <XCircle size={16} /> Annuler la commande
          </button>
        )}
      </div>

      {showDevis && commande.devis && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Devis {commande.devis.numero}</h2>
                <p className="text-xs text-gray-400">Validité : {new Date(commande.devis.dateValidite).toLocaleDateString("fr-FR")}</p>
              </div>
              <button onClick={() => setShowDevis(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Produits</p>
            <div className="space-y-2 mb-4">
              {commande.devis.lignes.map((l, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm text-gray-900">{l.brique.nom}{l.brique.dimensions ? ` — ${l.brique.dimensions}` : ""}</p>
                    <p className="text-xs text-gray-400">{devise} {l.prixUnit.toLocaleString()} / u</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">× {l.quantite}</p>
                    <p className="text-sm font-semibold text-gray-900">{devise} {(l.quantite * l.prixUnit).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-green-50 rounded-xl p-3 flex justify-between mb-3">
              <span className="text-sm text-gray-600">Total devis</span>
              <span className="text-sm font-bold text-green-700">{devise} {commande.devis.lignes.reduce((s, l) => s + l.quantite * l.prixUnit, 0).toLocaleString()}</span>
            </div>

            {commande.devis.notes && (
              <p className="text-xs text-gray-500 italic">{commande.devis.notes}</p>
            )}
          </div>
        </div>
      )}

      {confirmAnnulation && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 pb-10">
            <p className="text-base font-semibold text-gray-900 mb-2">Annuler la commande ?</p>
            <p className="text-sm text-gray-500 mb-6">Cette action est irréversible. La commande passera au statut Annulé.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAnnulation(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700">
                Retour
              </button>
              <button onClick={annulerCommande} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-medium">
                Confirmer l&apos;annulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
