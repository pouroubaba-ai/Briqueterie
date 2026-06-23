"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, ToggleLeft, ToggleRight, Trash2, Calendar, ShieldCheck } from "lucide-react";

type User = {
  id: number;
  email: string;
  nom: string;
  actif: boolean;
  abonnementDebut: string | null;
  abonnementFin: string | null;
  createdAt: string;
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}

function statutAbonnement(u: User) {
  if (!u.actif) return { label: "Désactivé", color: "bg-red-100 text-red-700" };
  if (u.abonnementFin && new Date() > new Date(u.abonnementFin)) return { label: "Expiré", color: "bg-orange-100 text-orange-700" };
  if (u.abonnementFin) return { label: "Actif", color: "bg-green-100 text-green-700" };
  return { label: "Sans abonnement", color: "bg-gray-100 text-gray-600" };
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDel, setConfirmDel] = useState<User | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ abonnementDebut: "", abonnementFin: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.status === 403) { router.push("/"); return; }
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActif(u: User) {
    await fetch(`/api/admin/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actif: !u.actif }) });
    load();
  }

  function openEdit(u: User) {
    setEditingId(u.id);
    setEditForm({
      abonnementDebut: u.abonnementDebut ? u.abonnementDebut.slice(0, 10) : "",
      abonnementFin: u.abonnementFin ? u.abonnementFin.slice(0, 10) : "",
    });
  }

  async function saveAbonnement(userId: number) {
    setSaving(true);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        abonnementDebut: editForm.abonnementDebut || null,
        abonnementFin: editForm.abonnementFin || null,
      }),
    });
    setSaving(false);
    setEditingId(null);
    load();
  }

  async function deleteUser() {
    if (!confirmDel || deleting) return;
    setDeleting(true);
    await fetch(`/api/admin/users/${confirmDel.id}`, { method: "DELETE" });
    setDeleting(false);
    setConfirmDel(null);
    setConfirmText("");
    load();
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Chargement…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-3 py-6">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Panneau Admin</h1>
            <p className="text-xs text-gray-500">{users.length} utilisateur(s)</p>
          </div>
        </div>

        <div className="space-y-3">
          {users.map(u => {
            const statut = statutAbonnement(u);
            return (
              <div key={u.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                {/* En-tête */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{u.nom || "Sans nom"}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Inscrit le {fmt(u.createdAt)}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${statut.color}`}>{statut.label}</span>
                </div>

                {/* Abonnement */}
                {editingId === u.id ? (
                  <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">Début</label>
                        <input type="date" value={editForm.abonnementDebut} onChange={e => setEditForm(f => ({ ...f, abonnementDebut: e.target.value }))}
                          className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">Fin</label>
                        <input type="date" value={editForm.abonnementFin} onChange={e => setEditForm(f => ({ ...f, abonnementFin: e.target.value }))}
                          className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveAbonnement(u.id)} disabled={saving}
                        className="flex-1 bg-green-600 text-white text-xs py-2 rounded-lg font-medium disabled:opacity-60">
                        {saving ? "Enregistrement…" : "Enregistrer"}
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-100 text-gray-600 text-xs py-2 rounded-lg font-medium">
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => openEdit(u)} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 w-full text-left bg-gray-50 rounded-xl px-3 py-2">
                    <Calendar size={13} className="text-gray-400 shrink-0" />
                    <span>
                      Abonnement : <span className="font-medium">{fmt(u.abonnementDebut)}</span> → <span className="font-medium">{fmt(u.abonnementFin)}</span>
                    </span>
                  </button>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => toggleActif(u)}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-medium transition-colors ${
                      u.actif ? "bg-orange-50 text-orange-600 hover:bg-orange-100" : "bg-green-50 text-green-600 hover:bg-green-100"
                    }`}>
                    {u.actif ? <><ToggleRight size={14} /> Désactiver</> : <><ToggleLeft size={14} /> Activer</>}
                  </button>
                  <button onClick={() => { setConfirmDel(u); setConfirmText(""); }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100">
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal confirmation suppression */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Supprimer ce compte ?</h2>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium">{confirmDel.nom || confirmDel.email}</span> et toutes ses données seront définitivement supprimés.
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1.5 text-center">Tapez <span className="font-bold text-red-600">OUI JE SUPPRIME</span> pour confirmer</p>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="OUI JE SUPPRIME"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:border-red-400"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setConfirmDel(null); setConfirmText(""); }}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium">
                Annuler
              </button>
              <button onClick={deleteUser} disabled={confirmText !== "OUI JE SUPPRIME" || deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-40">
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
