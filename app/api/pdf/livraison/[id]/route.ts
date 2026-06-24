export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { PDFDocument } from "@/components/PDFDocument";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [livraison, parametres] = await Promise.all([
      prisma.livraison.findUnique({
        where: { id: Number(id) },
        include: { commande: { include: { client: true } }, lignes: { include: { brique: true } } },
      }),
      prisma.parametres.findFirst(),
    ]);

    if (!livraison) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const lignes = livraison.lignes.map((l) => ({
      nom: l.brique.nom, dimensions: l.brique.dimensions ?? "", quantite: l.quantiteLivree, prixUnit: l.prixUnit || l.brique.prixVente,
    }));

    const buffer = await renderToBuffer(createElement(PDFDocument, {
      type: "livraison",
      numero: livraison.numero,
      date: livraison.dateLivraison.toISOString(),
      client: livraison.commande.client,
      lignes,
      acompte: livraison.commande.acompte,
      notes: livraison.notes ?? "",
      parametres: parametres ?? {},
    }));

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${livraison.numero}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF livraison error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
