// Bausteine für alle PDF-Dokumente (Rechnung, Angebot, Vertrag, Einwilligung, Drehplan, Monatsbericht, Skript).
// Weißes Papier, Logo als Vektor, ruhige Typografie. Hinweis: lineHeight nie auf <Page> setzen
// (react-pdf verliert sonst die absolut positionierten Fußzeilen), sondern auf die Texte.
import { Document, Page, Path, Polyline, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { Company } from "@/lib/settings";
import { LOGO_PATHS, LOGO_RATIO, LOGO_VIEWBOX } from "./logo";
import { C, MM, PAGE, registerFonts } from "./theme";

export const s = StyleSheet.create({
  page: {
    paddingTop: PAGE.marginTop,
    paddingBottom: PAGE.marginBottom,
    paddingHorizontal: PAGE.marginX,
    fontFamily: "Archivo",
    fontSize: 9.5,
    color: C.ink,
    backgroundColor: "#FFFFFF",
  },
  p: { fontSize: 9.5, lineHeight: 1.5, color: C.ink2 },
  small: { fontSize: 7.5, lineHeight: 1.45, color: C.muted },
  label: { fontFamily: "Courier Prime", fontSize: 7.5, letterSpacing: 0.8, textTransform: "uppercase", color: C.muted },
  h1: { fontWeight: 800, fontSize: 30, letterSpacing: -0.3, textTransform: "uppercase", color: C.ink, lineHeight: 1 },
  h2: { fontWeight: 700, fontSize: 11.5, color: C.ink, marginBottom: 4, lineHeight: 1.3 },
  h3: { fontWeight: 600, fontSize: 9.5, color: C.ink, lineHeight: 1.4 },
  rule: { borderBottomWidth: 0.6, borderBottomColor: C.line },
  strong: { fontWeight: 600, color: C.ink },
  mono: { fontFamily: "Courier Prime" },
});

export function Logo({ width = 92 }: { width?: number }) {
  return (
    <Svg viewBox={LOGO_VIEWBOX} style={{ width, height: width / LOGO_RATIO }}>
      {LOGO_PATHS.map((p) => (
        <Path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </Svg>
  );
}

/** Dokument mit registrierten Schriften und Metadaten. PDF/A-3b für Rechnungen (ZUGFeRD). */
export function PdfDocument({
  title,
  subject,
  company,
  pdfa = false,
  children,
}: {
  title: string;
  subject?: string;
  company: Company | null;
  pdfa?: boolean;
  children: React.ReactNode;
}) {
  registerFonts();
  return (
    <Document
      title={title}
      subject={subject}
      author={company?.brand ?? "SCM Creatives"}
      creator="SCM Studio"
      producer="SCM Studio"
      language="de-DE"
      {...(pdfa ? { conformance: "PDF/A-3b" as const } : {})}
    >
      {children}
    </Document>
  );
}

/**
 * Eine A4-Seite mit Kopf (Logo + Dokumentart) und Fußzeile (Firmenangaben + Seitenzahl).
 * `watermark` legt einen dezenten diagonalen Hinweis über jede Seite (z. B. "Entwurf, anwaltlich zu prüfen").
 */
export function PdfPage({
  company,
  kind,
  reference,
  watermark,
  children,
  footerNote,
  showBank = true,
}: {
  company: Company | null;
  kind: string;
  reference?: string;
  watermark?: string;
  children: React.ReactNode;
  footerNote?: string;
  /** Bankverbindung in der Fußzeile (nur für Rechnungen, Angebote, Mahnungen sinnvoll) */
  showBank?: boolean;
}) {
  return (
    <Page size="A4" style={s.page} wrap>
      {watermark && <Watermark text={watermark} />}
      <View fixed style={{ position: "absolute", top: 14 * MM, left: PAGE.marginX, right: PAGE.marginX, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <Logo width={88} />
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[s.label, { color: C.ink }]}>{kind}</Text>
          {reference ? <Text style={[s.label, { marginTop: 2 }]}>{reference}</Text> : null}
        </View>
      </View>
      <Footer company={company} note={footerNote} showBank={showBank} />
      <PageNumber />
      <View style={{ height: 22 * MM }} fixed />
      {children}
    </Page>
  );
}

/** Dezenter diagonaler Vermerk. Text mit "·" wird zweizeilig gesetzt (erste Zeile groß). */
function Watermark({ text }: { text: string }) {
  const [main, ...rest] = text.split("·").map((t) => t.trim());
  return (
    <View fixed style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
      <View style={{ transform: "rotate(-30deg)", alignItems: "center", opacity: 0.075 }}>
        <Text style={{ fontWeight: 800, fontSize: 64, textTransform: "uppercase", color: C.accent }}>{main}</Text>
        {rest.length ? <Text style={{ fontWeight: 800, fontSize: 20, textTransform: "uppercase", color: C.accent, marginTop: 4 }}>{rest.join(" · ")}</Text> : null}
      </View>
    </View>
  );
}

export function Footer({ company, note, showBank = true }: { company: Company | null; note?: string; showBank?: boolean }) {
  const c = company;
  const col = { flex: 1, paddingRight: 8 };
  return (
    <View fixed style={{ position: "absolute", left: PAGE.marginX, right: PAGE.marginX, bottom: 10 * MM }}>
      {note ? <Text style={[s.small, { marginBottom: 6 }]}>{note}</Text> : null}
      <View style={[s.rule, { marginBottom: 6 }]} />
      <View style={{ flexDirection: "row" }}>
        <View style={[col, { flex: 1.2 }]}>
          <Text style={[s.small, { color: C.ink, fontWeight: 600 }]}>{c?.brand ?? "SCM Creatives"}</Text>
          <Text style={s.small}>{c?.legalName ?? ""}</Text>
          <Text style={s.small}>{c?.owner ? `Inhaber ${c.owner}` : ""}</Text>
          <Text style={s.small}>{c ? `${c.street}, ${c.zip} ${c.city}` : ""}</Text>
        </View>
        <View style={col}>
          <Text style={s.small}>{c?.phone ?? ""}</Text>
          <Text style={s.small}>{c?.email ?? ""}</Text>
          <Text style={s.small}>{c?.web ?? ""}</Text>
        </View>
        <View style={col}>
          {showBank ? (
            c?.iban ? <Text style={s.small}>IBAN {formatIban(c.iban)}</Text> : <Text style={s.small}>IBAN [PLATZHALTER]</Text>
          ) : null}
          {showBank && c?.bic ? <Text style={s.small}>BIC {c.bic}{c.bankName ? ` · ${c.bankName}` : ""}</Text> : null}
          {c?.vatId ? <Text style={s.small}>USt-IdNr. {c.vatId}</Text> : null}
          {c?.taxNumber ? <Text style={s.small}>Steuernummer {c.taxNumber}</Text> : null}
        </View>
        <View style={{ width: 52 }} />
      </View>
    </View>
  );
}

/** Seitenzahl als eigenes festes Element direkt auf der Seite. Achtung: ohne lineHeight, sonst rendert react-pdf sie nicht. */
function PageNumber() {
  return (
    <Text
      fixed
      style={{ fontSize: 7.5, color: C.muted, position: "absolute", right: PAGE.marginX, bottom: 10 * MM + 22, width: 60, textAlign: "right" }}
      render={({ pageNumber, totalPages }) => `Seite ${pageNumber} / ${totalPages}`}
    />
  );
}

export const formatIban = (iban: string) => iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();

/** Absenderzeile + Anschrift (Fensterposition nach DIN 5008) links, Metadaten rechts. */
export function AddressHead({
  company,
  recipient,
  meta,
}: {
  company: Company | null;
  recipient: string[];
  meta: [string, string][];
}) {
  const sender = company ? `${company.legalName} · ${company.street} · ${company.zip} ${company.city}` : "";
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 * MM, marginBottom: 12 * MM }}>
      <View style={{ width: 85 * MM }}>
        <Text style={[s.small, { fontSize: 6.5, marginBottom: 6, textDecoration: "underline", textDecorationColor: C.line }]}>{sender}</Text>
        {recipient.filter(Boolean).map((line, i) => (
          <Text key={i} style={[s.p, { color: C.ink }, i === 0 ? { fontWeight: 600 } : {}]}>
            {line}
          </Text>
        ))}
      </View>
      <View style={{ width: 62 * MM }}>
        {meta.map(([k, v]) => (
          <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
            <Text style={s.label}>{k}</Text>
            <Text style={[s.p, { color: C.ink, fontSize: 9 }]}>{v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Titelzeile im Markenstil: Etikett in Schreibmaschine, Titel schmal und fett, roter Punkt. */
export function Title({ kicker, children, sub }: { kicker?: string; children: React.ReactNode; sub?: string }) {
  return (
    <View style={{ marginBottom: 8 * MM }}>
      {kicker ? (
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.accent, marginRight: 6 }} />
          <Text style={s.label}>{kicker}</Text>
        </View>
      ) : null}
      <Text style={s.h1}>{children}</Text>
      {sub ? <Text style={[s.p, { marginTop: 6, fontSize: 10.5 }]}>{sub}</Text> : null}
    </View>
  );
}

/**
 * Seitenumbruch-Regeln von react-pdf, die Blöcke mit Überschrift brauchen:
 * - Der untere Außenabstand zählt als Platz, der noch auf die Seite muss. Ein Block, der gerade so passt,
 *   rutschte sonst ganz auf die nächste Seite; `minPresenceAhead={-BLOCK_GAP}` gleicht genau das aus.
 * - minPresenceAhead wirkt nicht beim ersten Kind eines Blocks. Der leere Anker davor sorgt dafür,
 *   dass eine Überschrift mit ihrem Inhalt umbricht, statt allein unten auf der Seite zu stehen.
 */
export const BLOCK_GAP = 6 * MM;
export const HeadingAnchor = () => <View />;

export function Section({ title, number, children, style, wrap = true }: { title?: string; number?: string; children: React.ReactNode; style?: Style; wrap?: boolean }) {
  return (
    <View style={[{ marginBottom: BLOCK_GAP }, style ?? {}]} wrap={wrap} minPresenceAhead={-BLOCK_GAP}>
      {title ? <HeadingAnchor /> : null}
      {title ? (
        <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 4 }} minPresenceAhead={40}>
          {number ? <Text style={[s.label, { width: 26, color: C.accent }]}>{number}</Text> : null}
          <Text style={s.h2}>{title}</Text>
        </View>
      ) : null}
      <View style={number ? { paddingLeft: 26 } : {}}>{children}</View>
    </View>
  );
}

export function P({ children, style }: { children: React.ReactNode; style?: Style }) {
  return <Text style={[s.p, { marginBottom: 4 }, style ?? {}]}>{children}</Text>;
}

/** Spaltentabelle; Kopf wiederholt sich auf Folgeseiten, Zeilen werden nicht zerteilt. */
export type Col<T> = { key: string; label: string; width: number | string; align?: "left" | "right"; render: (row: T, i: number) => React.ReactNode };

export function PdfTable<T>({ cols, rows, zebra = false }: { cols: Col<T>[]; rows: T[]; zebra?: boolean }) {
  const cell = (c: Col<T>) => ({ width: c.width, paddingHorizontal: 4, textAlign: c.align ?? "left" }) as Style;
  return (
    <View>
      <View fixed style={{ flexDirection: "row", borderBottomWidth: 0.8, borderBottomColor: C.ink, paddingBottom: 4, marginBottom: 2 }}>
        {cols.map((c) => (
          <Text key={c.key} style={[s.label, cell(c)]}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} wrap={false} style={{ flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: C.line, backgroundColor: zebra && i % 2 ? C.soft : undefined }}>
          {cols.map((c) => (
            <View key={c.key} style={cell(c)}>
              {wrapText(c.render(r, i), c.align)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function wrapText(node: React.ReactNode, align?: "left" | "right") {
  if (typeof node === "string" || typeof node === "number") return <Text style={[s.p, { color: C.ink, textAlign: align ?? "left" }]}>{node}</Text>;
  return node;
}

/** Schlüssel/Wert-Liste (z. B. Projektdaten, Paket, Laufzeit). */
export function KeyValues({ rows, labelWidth = 120 }: { rows: [string, React.ReactNode][]; labelWidth?: number }) {
  return (
    <View>
      {rows.map(([k, v]) => (
        <View key={k} style={{ flexDirection: "row", paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: C.line }} wrap={false}>
          <Text style={[s.label, { width: labelWidth, paddingTop: 1.5 }]}>{k}</Text>
          <View style={{ flex: 1 }}>{typeof v === "string" ? <Text style={[s.p, { color: C.ink }]}>{v}</Text> : v}</View>
        </View>
      ))}
    </View>
  );
}

/** Unterschriftsfeld; Striche (aus signature_pad, nur Geometrie) werden als Vektor gezeichnet. */
export function SignatureBox({
  label,
  name,
  place,
  date,
  strokes,
  width = 75 * MM,
}: {
  label: string;
  name?: string | null;
  place?: string | null;
  date?: string | null;
  strokes?: number[][][] | null;
  width?: number;
}) {
  const h = 18 * MM;
  return (
    <View style={{ width }} wrap={false}>
      <View style={{ height: h, justifyContent: "flex-end" }}>
        {strokes && strokes.length > 0 ? <SignatureStrokes strokes={strokes} width={width} height={h} /> : null}
      </View>
      <View style={{ borderTopWidth: 0.8, borderTopColor: C.ink, paddingTop: 3 }}>
        <Text style={s.label}>{label}</Text>
        {name ? <Text style={[s.p, { color: C.ink, marginTop: 1 }]}>{name}</Text> : null}
        {place || date ? <Text style={s.small}>{[place, date].filter(Boolean).join(", ")}</Text> : null}
      </View>
    </View>
  );
}

function SignatureStrokes({ strokes, width, height }: { strokes: number[][][]; width: number; height: number }) {
  const pts = strokes.flat();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(1, Math.max(...xs) - minX);
  const hh = Math.max(1, Math.max(...ys) - minY);
  return (
    <Svg viewBox={`${minX - 4} ${minY - 4} ${w + 8} ${hh + 8}`} style={{ width: Math.min(width, (height * (w + 8)) / (hh + 8)), height }}>
      {strokes.map((st, i) =>
        st.length === 1 ? (
          <Polyline key={i} points={`${st[0][0]},${st[0][1]} ${st[0][0] + 0.5},${st[0][1] + 0.5}`} stroke={C.ink} strokeWidth={2.4} fill="none" />
        ) : (
          <Polyline key={i} points={st.map((p) => `${p[0]},${p[1]}`).join(" ")} stroke={C.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ),
      )}
    </Svg>
  );
}

/** Kleiner Hinweiskasten (z. B. Entwurfsvermerk, Rechtshinweis). */
export function Note({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" }) {
  return (
    <View
      style={{
        borderLeftWidth: 2,
        borderLeftColor: tone === "accent" ? C.accent : C.ink,
        backgroundColor: C.soft,
        paddingVertical: 6,
        paddingHorizontal: 8,
        marginBottom: 6 * MM,
      }}
      wrap={false}
    >
      <Text style={[s.p, { fontSize: 8.5 }]}>{children}</Text>
    </View>
  );
}

export { Text, View };
