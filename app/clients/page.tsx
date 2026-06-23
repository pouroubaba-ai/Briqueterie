export const dynamic = "force-dynamic";
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";

type Client = { id: number; nom: string; telephone: string; adresse: string };

export default function Clients() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    fetch("/api/clients").then(r => r.json()).then(setClients);
  }, []);

  return (
    <div className="pb-6">
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Clients</h1>
            <p className="text-xs text-gray-500">{clients.length} client(s)</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {clients.length === 0 && (
          <div className="text-center py-14">
            <Users size={44} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucun client</p>
          </div>
        )}
        {clients.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-green-700">{c.nom[0].toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{c.nom}</p>
              {c.telephone && <p className="text-xs text-gray-400">{c.telephone}</p>}
              {c.adresse && <p className="text-xs text-gray-400 truncate">{c.adresse}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
