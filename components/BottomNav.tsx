"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart,
  Receipt, Wallet, Settings, Menu, X, FileText, Truck,
  History, ChevronDown, TrendingDown, TrendingUp, Briefcase,
  BarChart2, Factory, Building2, CreditCard, LogOut, HardHat,
} from "lucide-react";

const financesLinks = [
  { href: "/finances/synthese",  icon: BarChart2,  label: "Synthèse" },
  { href: "/finances/depenses",  icon: CreditCard, label: "Dépenses" },
];

const commercialLinks = [
  { href: "/devis",      icon: FileText,      label: "Devis"      },
  { href: "/commandes",  icon: ShoppingCart,  label: "Commandes"  },
  { href: "/livraisons", icon: Truck,         label: "Livraisons" },
  { href: "/factures",   icon: Receipt,       label: "Factures"   },
];

export default function BurgerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nomBriqueterie, setNomBriqueterie] = useState("Briqueterie");
  const [histOpen, setHistOpen] = useState(pathname.startsWith("/historique"));
  const commercialPaths = ["/devis", "/commandes", "/livraisons", "/factures"];
  const [commOpen, setCommOpen] = useState(commercialPaths.some(p => pathname.startsWith(p)));
  const [finOpen, setFinOpen] = useState(pathname.startsWith("/finances"));

  const histActive = pathname.startsWith("/historique");
  const commActive = commercialPaths.some(p => pathname.startsWith(p));
  const finActive = pathname.startsWith("/finances");

  useEffect(() => {
    fetch("/api/parametres").then(r => r.json()).then(d => {
      if (d?.nomBriqueterie) setNomBriqueterie(d.nomBriqueterie);
    }).catch(() => {});
  }, []);

  async function deconnecter() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function NavLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
      <Link href={href} onClick={() => setOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
          active ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}>
        <Icon size={18} strokeWidth={active ? 2.5 : 1.8} className={active ? "text-green-600" : "text-gray-400"} />
        {label}
        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500" />}
      </Link>
    );
  }

  function SubLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
    const active = pathname.startsWith(href);
    return (
      <Link href={href} onClick={() => setOpen(false)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${
          active ? "bg-green-50 text-green-700 font-medium" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
        }`}>
        <Icon size={15} className={active ? "text-green-600" : "text-gray-400"} />
        {label}
        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500" />}
      </Link>
    );
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 h-14">
          <button onClick={() => setOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 text-gray-600">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
              <HardHat size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-800">{nomBriqueterie}</span>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center">
                  <HardHat size={16} className="text-white" />
                </div>
                <span className="text-base font-bold text-gray-900">{nomBriqueterie}</span>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50">
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {/* Tableau de bord */}
              <NavLink href="/" icon={LayoutDashboard} label="Tableau de bord" />

              {/* Inventaire */}
              <NavLink href="/stock" icon={Package} label="Inventaire" />

              {/* Production */}
              <NavLink href="/finances/production" icon={Factory} label="Production" />

              {/* Commercial accordéon */}
              <div>
                <button onClick={() => setCommOpen(c => !c)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    commActive ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}>
                  <Briefcase size={18} strokeWidth={commActive ? 2.5 : 1.8} className={commActive ? "text-green-600" : "text-gray-400"} />
                  <span className="flex-1 text-left">Commercial</span>
                  <ChevronDown size={15} className={`text-gray-400 transition-transform duration-200 ${commOpen ? "rotate-180" : ""}`} />
                </button>
                {commOpen && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {commercialLinks.map(l => <SubLink key={l.href} {...l} />)}
                  </div>
                )}
              </div>

              {/* Fournisseurs */}
              <NavLink href="/fournisseurs" icon={Building2} label="Fournisseurs" />

              {/* Finances accordéon */}
              <div>
                <button onClick={() => setFinOpen(f => !f)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    finActive ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}>
                  <Wallet size={18} strokeWidth={finActive ? 2.5 : 1.8} className={finActive ? "text-green-600" : "text-gray-400"} />
                  <span className="flex-1 text-left">Finances</span>
                  <ChevronDown size={15} className={`text-gray-400 transition-transform duration-200 ${finOpen ? "rotate-180" : ""}`} />
                </button>
                {finOpen && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {financesLinks.map(l => <SubLink key={l.href} {...l} />)}
                  </div>
                )}
              </div>

              {/* Historique accordéon */}
              <div>
                <button onClick={() => setHistOpen(h => !h)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    histActive ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}>
                  <History size={18} strokeWidth={histActive ? 2.5 : 1.8} className={histActive ? "text-green-600" : "text-gray-400"} />
                  <span className="flex-1 text-left">Historique</span>
                  <ChevronDown size={15} className={`text-gray-400 transition-transform duration-200 ${histOpen ? "rotate-180" : ""}`} />
                </button>
                {histOpen && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    <Link href="/historique?type=sortie" onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800">
                      <TrendingDown size={15} className="text-red-400" />
                      Sorties
                    </Link>
                    <Link href="/historique?type=entree" onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800">
                      <TrendingUp size={15} className="text-green-400" />
                      Entrées
                    </Link>
                  </div>
                )}
              </div>

              {/* Réglages */}
              <NavLink href="/parametres" icon={Settings} label="Réglages" />
            </nav>

            {/* Bouton déconnexion en bas */}
            <div className="px-3 py-4 border-t border-gray-100">
              <button onClick={deconnecter}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                <LogOut size={18} className="text-red-500" />
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
