"use client";
import { PhoneCall, Lock } from "lucide-react";

export default function AbonnementExpire() {
  const tel = process.env.NEXT_PUBLIC_ADMIN_PHONE ?? "";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center space-y-5">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <Lock size={28} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Abonnement expiré</h1>
          <p className="text-sm text-gray-500 mt-2">
            Votre accès a été suspendu. Contactez-nous pour renouveler votre abonnement.
          </p>
        </div>
        {tel && (
          <a href={`tel:${tel}`} className="flex items-center justify-center gap-2 w-full bg-green-600 text-white py-3 rounded-xl font-medium text-sm">
            <PhoneCall size={18} />
            Appeler : {tel}
          </a>
        )}
        <a href="/login" className="block text-xs text-gray-400 hover:text-gray-600">
          Se connecter avec un autre compte
        </a>
      </div>
    </div>
  );
}
