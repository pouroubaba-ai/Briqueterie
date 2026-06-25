"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const steps = [
  { href: "/devis", label: "Devis" },
  { href: "/commandes", label: "Commandes" },
  { href: "/livraisons", label: "Livraisons" },
  { href: "/factures", label: "Factures" },
];

export default function CycleVenteNav() {
  const pathname = usePathname();
  const activeIndex = steps.findIndex(s => pathname.startsWith(s.href));

  return (
    <div className="flex items-center gap-0 overflow-x-auto px-4 py-2 bg-white border-b border-gray-100">
      {steps.map((step, i) => {
        const isActive = pathname.startsWith(step.href);
        const isPast = activeIndex > i;
        return (
          <div key={step.href} className="flex items-center shrink-0">
            <Link href={step.href}
              className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                isActive ? "bg-green-600 text-white" :
                isPast ? "text-green-600" : "text-gray-400"
              }`}>
              {step.label}
            </Link>
            {i < steps.length - 1 && (
              <span className={`mx-0.5 text-xs ${isPast || isActive ? "text-green-400" : "text-gray-300"}`}>›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
