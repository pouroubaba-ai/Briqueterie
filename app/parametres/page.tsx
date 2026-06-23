"use client";
import { useEffect, useState } from "react";
import { Save, Upload, Building2 } from "lucide-react";

const DEVISES = ["FCFA", "GNF", "MAD", "EUR", "USD", "XOF", "DZD", "TND", "MRU"];

type Params = {
  nomBriqueterie: string;
  telephone: string;
  adresse: string;
  devise: string;
  tarifParSac: number;
  conditionPaiement: string;
  logo: string;
};

export default function Parametres() {
  const [form, setForm] = useState<Params>({
    nomBriqueterie: "", telephone: "", adresse: "",
    devise: "FCFA", tarifParSac: 0, conditionPaiement: "Paiement sous 14 jours", logo: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/parametres").then(r => r.json()).then(setForm);
  }, []);

  function set(k: keyof Params, v: string | number) {
    setForm(f => ({ ...f, [k]: v }));
    setSaved(false);
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("logo", reader.result as string);
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    await fetch("/api/parametres", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="pb-4">
      <div className="bg-white border-b border-gray-200 px-4 py-4 z-10">
        <h1 className="text-base font-semibold text-gray-900">Paramètres</h1>
        <p className="text-xs text-gray-500">Configuration de votre briqueterie</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Logo */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Logo & Identité</p>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
              {form.logo
                ? <img src={form.logo} alt="logo" className="w-full h-full object-contain" />
                : <Building2 size={24} className="text-gray-300" />}
            </div>
            <div>
              <label className="cursor-pointer flex items-center gap-2 text-sm text-green-600 font-medium">
                <Upload size={16} />
                {form.logo ? "Changer le logo" : "Ajouter un logo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
              </label>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG — affiché sur les PDF</p>
            </div>
          </div>
        </div>

        {/* Infos briqueterie */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Informations</p>
          {[
            { label: "Nom de la briqueterie", key: "nomBriqueterie", placeholder: "Ex: Briqueterie Kamara" },
            { label: "Téléphone", key: "telephone", placeholder: "Ex: +224 620 000 000" },
            { label: "Adresse", key: "adresse", placeholder: "Ex: Conakry, Guinée" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 mb-1 block">{label}</label>
              <input
                value={form[key as keyof Params] as string}
                onChange={e => set(key as keyof Params, e.target.value)}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-green-500"
              />
            </div>
          ))}
        </div>

        {/* Devise & conditions */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Paramètres commerciaux</p>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Devise</label>
            <select
              value={form.devise}
              onChange={e => set("devise", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-green-500 bg-white"
            >
              {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Conditions de paiement par défaut</label>
            <input
              value={form.conditionPaiement}
              onChange={e => set("conditionPaiement", e.target.value)}
              placeholder="Ex: Paiement sous 14 jours"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-green-500"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-colors ${
            saved ? "bg-green-50 text-green-600 border border-green-200" : "bg-green-600 text-white"
          }`}
        >
          <Save size={16} />
          {saving ? "Enregistrement..." : saved ? "Enregistré !" : "Enregistrer les paramètres"}
        </button>
      </div>
    </div>
  );
}
