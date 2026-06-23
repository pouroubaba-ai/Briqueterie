import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { PDFDocument } from "@/components/PDFDocument";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [commande, parametres] = await Promise.all([
      prisma.commande.findUnique({
        where: { id: Number(id) },
        include: { client: true, lignes: { include: { brique: true } } },
      }),
      prisma.parametres.findFirst(),
    ]);

    if (!commande) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const lignes = commande.lignes.map((l) => ({
      nom: l.brique.nom, dimensions: l.brique.dimensions ?? "", quantite: l.quantite, prixUnit: l.prixUnit,
    }));

    const buffer = await renderToBuffer(createElement(PDFDocument, {
      type: "commande",
      numero: commande.numero,
      date: commande.createdAt.toISOString(),
      echeance: commande.dateLivraisonPrevue?.toISOString(),
      client: commande.client,
      lignes,
      transport: commande.transport,
      acompte: commande.acompte,
      notes: commande.notes ?? "",
      parametres: parametres ?? {},
    }));

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${commande.numero}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF commande error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
