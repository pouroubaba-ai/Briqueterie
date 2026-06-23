"use client";
import { FileDown, Share2 } from "lucide-react";
import { useState } from "react";

type Props = {
  type: "devis" | "commande" | "livraison" | "facture";
  id: number;
  numero: string;
};

export default function PDFButton({ type, id, numero }: Props) {
  const [loading, setLoading] = useState(false);

  async function downloadPDF() {
    setLoading(true);
    try {
      const res = await fetch(`/api/pdf/${type}/${id}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${numero}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  async function sharePDF() {
    setLoading(true);
    try {
      const res = await fetch(`/api/pdf/${type}/${id}`);
      const blob = await res.blob();
      const file = new File([blob], `${numero}.pdf`, { type: "application/pdf" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: numero });
      } else {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button onClick={downloadPDF} disabled={loading}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 disabled:opacity-40">
        <FileDown size={14} />
        {loading ? "..." : "PDF"}
      </button>
      <button onClick={sharePDF} disabled={loading}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-medium disabled:opacity-40">
        <Share2 size={14} />
        Partager
      </button>
    </div>
  );
}
