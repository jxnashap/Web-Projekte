// Demo-Beleg (Kassenbon) für die lokale Vorschau. Nur vom Seed genutzt.
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { createElement } from "react";
import { renderPdf } from "@/lib/pdf/render";
import { registerFonts } from "@/lib/pdf/theme";
import { eurText, isoToDe, splitGross } from "./core";

export async function demoReceiptPdf(opts: { shop: string; date: string; lines: [string, number][]; rate: number }): Promise<Uint8Array> {
  registerFonts();
  const gross = opts.lines.reduce((s, [, c]) => s + c, 0);
  const { netCents, taxCents } = splitGross(gross, opts.rate);
  const mono = { fontFamily: "Courier Prime", fontSize: 9, color: "#111" };
  const row = (a: string, b: string, bold = false) => (
    <View key={a} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
      <Text style={[mono, bold ? { fontWeight: 700 } : {}]}>{a}</Text>
      <Text style={[mono, bold ? { fontWeight: 700 } : {}]}>{b}</Text>
    </View>
  );
  return renderPdf(
    createElement(
      Document,
      { title: "Demo-Beleg" },
      <Page size={[226, 400]} style={{ padding: 16, backgroundColor: "#FBFAF7" }}>
        <Text style={[mono, { fontSize: 11, fontWeight: 700, textAlign: "center" }]}>{opts.shop}</Text>
        <Text style={[mono, { textAlign: "center", marginBottom: 10 }]}>DEMO-BELEG · nicht echt</Text>
        <Text style={[mono, { marginBottom: 8 }]}>{isoToDe(opts.date)} 14:32</Text>
        {opts.lines.map(([t, c]) => row(t, eurText(c)))}
        <View style={{ borderTopWidth: 1, borderTopColor: "#111", marginVertical: 6 }} />
        {row("SUMME", eurText(gross), true)}
        {row(`davon USt ${opts.rate} %`, eurText(taxCents))}
        {row("Netto", eurText(netCents))}
        <Text style={[mono, { marginTop: 12, textAlign: "center" }]}>Vielen Dank!</Text>
      </Page>,
    ),
  );
}
