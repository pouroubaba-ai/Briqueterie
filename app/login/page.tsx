"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Erreur de connexion");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Briqueterie</h1>
          <p className="text-sm text-gray-500 mt-1">Connectez-vous à votre compte</p>
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl shadow p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="exemple@email.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Mot de passe</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Pas de compte ?{" "}
          <Link href="/register" className="text-blue-600 font-medium">Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}
