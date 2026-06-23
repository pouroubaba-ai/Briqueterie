import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { PDFDocument } from "@/components/PDFDocument";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [devis, parametres] = await Promise.all([
      prisma.devis.findUnique({
        where: { id: Number(id) },
        include: { client: true, lignes: { include: { brique: true } } },
      }),
      prisma.parametres.findFirst(),
    ]);

    if (!devis) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const lignes = devis.lignes.map((l) => ({
      nom: l.brique?.nom ?? "Article", dimensions: l.brique?.dimensions ?? "", quantite: l.quantite, prixUnit: l.prixUnit,
    }));

    const buffer = await renderToBuffer(createElement(PDFDocument, {
      type: "devis",
      numero: devis.numero,
      date: devis.createdAt.toISOString(),
      echeance: devis.dateValidite.toISOString(),
      client: devis.client,
      lignes,
      notes: devis.notes ?? "",
      parametres: parametres ?? {},
    }));

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${devis.numero}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF devis error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
