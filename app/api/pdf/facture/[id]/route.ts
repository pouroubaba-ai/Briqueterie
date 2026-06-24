export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { PDFDocument } from "@/components/PDFDocument";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [facture, parametres] = await Promise.all([
      prisma.facture.findUnique({
        where: { id: Number(id) },
        include: { livraison: { include: { commande: { include: { client: true } }, lignes: { include: { brique: true } } } }, paiements: true },
      }),
      prisma.parametres.findFirst(),
    ]);

    if (!facture) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const lignes = facture.livraison.lignes.map((l) => ({
      nom: l.brique.nom, dimensions: l.brique.dimensions ?? "", quantite: l.quantiteLivree, prixUnit: l.prixUnit || l.brique.prixVente,
    }));

    const buffer = await renderToBuffer(createElement(PDFDocument, {
      type: "facture",
      numero: facture.numero,
      date: facture.dateEmission.toISOString(),
      echeance: facture.dateEcheance.toISOString(),
      client: facture.livraison.commande.client,
      lignes,
      transport: facture.transport,
      acompte: facture.livraison.commande.acompte,
      paiements: facture.paiements.map((p) => ({ montant: p.montant, date: p.date.toISOString() })),
      notes: facture.notes ?? "",
      parametres: parametres ?? {},
    }));

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${facture.numero}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF facture error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
