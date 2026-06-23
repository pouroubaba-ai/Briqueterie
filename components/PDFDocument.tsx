import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#1f2937" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 },
  logo: { width: 60, height: 60, objectFit: "contain" },
  companyInfo: { flex: 1, marginLeft: 16 },
  companyName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#166534", marginBottom: 4 },
  companyDetail: { fontSize: 9, color: "#6b7280", marginBottom: 2 },
  docTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#166534", textAlign: "right" },
  docNum: { fontSize: 10, color: "#6b7280", textAlign: "right", marginTop: 4 },
  docDate: { fontSize: 9, color: "#6b7280", textAlign: "right", marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  clientBox: { backgroundColor: "#f9fafb", borderRadius: 6, padding: 12 },
  clientName: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  clientDetail: { fontSize: 9, color: "#6b7280", marginBottom: 2 },
  table: { marginBottom: 16 },
  tableHeader: { flexDirection: "row", backgroundColor: "#166534", padding: 8, borderRadius: 4 },
  tableHeaderText: { color: "white", fontFamily: "Helvetica-Bold", fontSize: 9 },
  tableRow: { flexDirection: "row", padding: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  tableRowAlt: { flexDirection: "row", padding: 8, backgroundColor: "#f9fafb", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: "center" },
  col3: { flex: 1, textAlign: "right" },
  col4: { flex: 1, textAlign: "right" },
  totals: { alignItems: "flex-end", marginBottom: 20 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", width: 200, paddingVertical: 3 },
  totalLabel: { fontSize: 9, color: "#6b7280" },
  totalValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  totalFinalBox: { backgroundColor: "#166534", borderRadius: 6, padding: 10, width: 200, flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  totalFinalLabel: { color: "white", fontFamily: "Helvetica-Bold", fontSize: 11 },
  totalFinalValue: { color: "white", fontFamily: "Helvetica-Bold", fontSize: 11 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: "flex-start" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: "#9ca3af" },
  paymentSection: { backgroundColor: "#f0fdf4", borderRadius: 6, padding: 12, marginBottom: 16 },
  paymentRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  notesBox: { backgroundColor: "#fefce8", borderRadius: 6, padding: 10, marginBottom: 16 },
});

type Params = {
  type: "devis" | "commande" | "livraison" | "facture";
  numero: string;
  date: string;
  echeance?: string;
  client: { nom: string; telephone?: string; adresse?: string };
  lignes: { nom: string; dimensions?: string; quantite: number; prixUnit: number }[];
  transport?: number;
  acompte?: number;
  paiements?: { montant: number; date: string }[];
  notes?: string;
  conditionsPaiement?: string;
  parametres: { nomBriqueterie?: string; telephone?: string; adresse?: string; logo?: string; devise?: string };
};

const TYPES: Record<string, string> = {
  devis: "DEVIS",
  commande: "BON DE COMMANDE",
  livraison: "BON DE LIVRAISON",
  facture: "FACTURE",
};

export function PDFDocument({ type, numero, date, echeance, client, lignes, transport = 0, acompte = 0, paiements = [], notes, conditionsPaiement, parametres }: Params) {
  const devise = parametres.devise ?? "FCFA";
  const sousTotal = lignes.reduce((s, l) => s + l.quantite * l.prixUnit, 0);
  const total = sousTotal + transport;
  const totalPaye = paiements.reduce((s, p) => s + p.montant, 0) + acompte;
  const reste = total - totalPaye;

  function fmt(n: number) { return `${devise} ${Math.round(n).toLocaleString("fr-FR")}`; }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            {parametres.logo && <Image src={parametres.logo} style={styles.logo} />}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{parametres.nomBriqueterie ?? "Briqueterie"}</Text>
              {parametres.telephone && <Text style={styles.companyDetail}>{parametres.telephone}</Text>}
              {parametres.adresse && <Text style={styles.companyDetail}>{parametres.adresse}</Text>}
            </View>
          </View>
          <View>
            <Text style={styles.docTitle}>{TYPES[type]}</Text>
            <Text style={styles.docNum}>{numero}</Text>
            <Text style={styles.docDate}>Date : {new Date(date).toLocaleDateString("fr-FR")}</Text>
            {echeance && <Text style={styles.docDate}>Échéance : {new Date(echeance).toLocaleDateString("fr-FR")}</Text>}
          </View>
        </View>

        {/* Client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <View style={styles.clientBox}>
            <Text style={styles.clientName}>{client.nom}</Text>
            {client.telephone && <Text style={styles.clientDetail}>{client.telephone}</Text>}
            {client.adresse && <Text style={styles.clientDetail}>{client.adresse}</Text>}
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.col1]}>Désignation</Text>
            <Text style={[styles.tableHeaderText, styles.col2]}>Qté</Text>
            <Text style={[styles.tableHeaderText, styles.col3]}>P.U ({devise})</Text>
            <Text style={[styles.tableHeaderText, styles.col4]}>Total</Text>
          </View>
          {lignes.map((l, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <View style={styles.col1}>
                <Text style={{ fontSize: 10 }}>{l.nom}</Text>
                {l.dimensions && <Text style={{ fontSize: 8, color: "#6b7280" }}>{l.dimensions}</Text>}
              </View>
              <Text style={[{ fontSize: 10 }, styles.col2]}>{l.quantite}</Text>
              <Text style={[{ fontSize: 10 }, styles.col3]}>{l.prixUnit.toLocaleString("fr-FR")}</Text>
              <Text style={[{ fontSize: 10, fontFamily: "Helvetica-Bold" }, styles.col4]}>{(l.quantite * l.prixUnit).toLocaleString("fr-FR")}</Text>
            </View>
          ))}
        </View>

        {/* Totaux */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sous-total</Text>
            <Text style={styles.totalValue}>{fmt(sousTotal)}</Text>
          </View>
          {transport > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Transport</Text>
              <Text style={styles.totalValue}>{fmt(transport)}</Text>
            </View>
          )}
          {type === "facture" && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { fontFamily: "Helvetica-Bold", color: "#1f2937" }]}>Total facture</Text>
              <Text style={[styles.totalValue, { color: "#1f2937" }]}>{fmt(total)}</Text>
            </View>
          )}
          {acompte > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: "#2563eb" }]}>Acompte reçu</Text>
              <Text style={[styles.totalValue, { color: "#2563eb" }]}>− {fmt(acompte)}</Text>
            </View>
          )}
          {paiements.map((p, i) => (
            <View key={i} style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: "#2563eb" }]}>Paiement {new Date(p.date).toLocaleDateString("fr-FR")}</Text>
              <Text style={[styles.totalValue, { color: "#2563eb" }]}>− {fmt(p.montant)}</Text>
            </View>
          ))}
          {type !== "facture" && (
            <View style={styles.totalFinalBox}>
              <Text style={styles.totalFinalLabel}>Total</Text>
              <Text style={styles.totalFinalValue}>{fmt(total)}</Text>
            </View>
          )}
          {type === "facture" && (
            <View style={[styles.totalFinalBox, { backgroundColor: reste <= 0 ? "#15803d" : "#166534" }]}>
              <Text style={styles.totalFinalLabel}>{reste <= 0 ? "✓ Soldée" : "Reste à payer"}</Text>
              <Text style={styles.totalFinalValue}>{reste <= 0 ? "0" : fmt(reste)}</Text>
            </View>
          )}
        </View>

        {/* Notes & Conditions */}
        {(notes || conditionsPaiement) && (
          <View style={styles.notesBox}>
            {conditionsPaiement && <Text style={{ fontSize: 9, marginBottom: 3 }}>Conditions : {conditionsPaiement}</Text>}
            {notes && <Text style={{ fontSize: 9, color: "#6b7280" }}>{notes}</Text>}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{parametres.nomBriqueterie ?? "Briqueterie"}</Text>
          <Text style={styles.footerText}>{TYPES[type]} {numero}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
