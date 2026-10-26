// Gemeinsame PDF-Bausteine der Dokumente (auf Basis von src/lib/pdf/components.tsx).
import { Text, View } from "@react-pdf/renderer";
import { KeyValues, P, PdfPage, s, Section, SignatureBox, Title } from "@/lib/pdf/components";
import { C, MM } from "@/lib/pdf/theme";
import { SIGNER_SHORT, type SignatureEntry } from "../schema";
import type { RenderCtx } from "./types";

export const DRAFT_LEGAL = "Entwurf · anwaltlich zu prüfen";

export const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
};

/** Zeitpunkt in Berliner Zeit, z. B. "26.10.2026, 14:05 Uhr" */
export const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
  return `${p} Uhr`;
};

export function Bullets({ items, mono = false }: { items: string[]; mono?: boolean }) {
  return (
    <View style={{ marginBottom: 4 }}>
      {items.map((t, i) => (
        <View key={i} style={{ flexDirection: "row", marginBottom: 2 }} wrap={false}>
          <Text style={[s.p, { width: 10, color: C.accent }]}>•</Text>
          <Text style={[s.p, { flex: 1 }, mono ? s.mono : {}]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

/** Ankreuzfeld mit Text (gezeichnetes Kästchen, kein Sonderzeichen nötig) */
export function CheckRow({ checked, label, text }: { checked: boolean; label?: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 6 }} wrap={false}>
      <View style={{ width: 11, height: 11, borderWidth: 0.9, borderColor: C.ink, marginRight: 8, marginTop: 1.5, alignItems: "center", justifyContent: "center" }}>
        {checked ? <Text style={{ fontSize: 9, fontWeight: 700, color: C.ink, marginTop: -1 }}>X</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        {label ? <Text style={[s.h3, { marginBottom: 1 }]}>{label}</Text> : null}
        <Text style={[s.p, { color: checked ? C.ink : C.muted }]}>{text}</Text>
      </View>
    </View>
  );
}

/** Nummerierter Paragraph (§ 1, § 2 …) mit Absätzen (1), (2) … */
export function Paragraph({ n, title, items }: { n: number; title: string; items: (string | { bullets: string[] })[] }) {
  let abs = 0;
  return (
    <Section title={title} number={`§ ${n}`}>
      {items.map((it, i) => {
        if (typeof it !== "string") return <Bullets key={i} items={it.bullets} />;
        abs += 1;
        const numbered = items.filter((x) => typeof x === "string").length > 1;
        return (
          <View key={i} style={{ flexDirection: "row" }} wrap={false}>
            {numbered ? <Text style={[s.p, { width: 18, color: C.muted }]}>({abs})</Text> : null}
            <P style={{ flex: 1 }}>{it}</P>
          </View>
        );
      })}
    </Section>
  );
}

/** Unterschriftenzeile mit bis zu zwei Feldern nebeneinander. */
export function SignatureRow({ boxes }: { boxes: { label: string; name?: string | null; place?: string | null; date?: string | null; strokes?: number[][][] | null }[] }) {
  const rows: (typeof boxes)[] = [];
  for (let i = 0; i < boxes.length; i += 2) rows.push(boxes.slice(i, i + 2));
  return (
    <View style={{ marginTop: 4 * MM }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 * MM }} wrap={false}>
          {r.map((b, j) => (
            <SignatureBox key={j} label={b.label} name={b.name} place={b.place} date={b.date} strokes={b.strokes} width={74 * MM} />
          ))}
        </View>
      ))}
    </View>
  );
}

export const sigFor = (list: SignatureEntry[] | undefined, role: string) => list?.find((x) => x.role === role);

/** Hash in lesbare Vierergruppen umbrechen */
const chunk = (h: string) => h.replace(/(.{8})/g, "$1 ").trim();

/** Prüfprotokoll als letzte Seite einer unterschriebenen Fassung */
export function ProofPage({ ctx, kindLabel }: { ctx: RenderCtx; kindLabel: string }) {
  const p = ctx.proof;
  if (!p) return null;
  return (
    <PdfPage company={ctx.company} kind="Prüfprotokoll" reference={`Dokument ${ctx.doc.id}`}>
      <Title kicker="Nachweis der Unterschrift">Prüfprotokoll</Title>
      <Section title="Dokument">
        <KeyValues
          labelWidth={130}
          rows={[
            ["Art", kindLabel],
            ["Titel", ctx.doc.title],
            ["Dokument-Nr.", String(ctx.doc.id)],
            ["Vorlage", ctx.doc.templateVersion ?? "nicht versioniert"],
            ["Inhalts-Hash", <Text key="h" style={[s.mono, { fontSize: 8, color: C.ink }]}>{`SHA-256 ${chunk(p.versionHash)}`}</Text>],
          ]}
        />
      </Section>
      <Section title="Unterschriften">
        <KeyValues labelWidth={130} rows={p.signatures.map((x) => [SIGNER_SHORT[x.role] ?? x.label, `${x.name || "ohne Namen"} · ${fmtDateTime(x.signedAt)}`] as [string, string])} />
      </Section>
      <Section title="Umstände der Unterzeichnung">
        <KeyValues
          labelWidth={130}
          rows={[
            ["Serverzeit", fmtDateTime(p.serverTime)],
            ["Ort", p.place || "nicht angegeben"],
            ["Erfasst durch", p.capturedBy ?? "nicht angegeben"],
            ["IP-Adresse", p.ip || "nicht ermittelbar"],
            ["Gerät/Browser", (p.userAgent ?? "nicht ermittelbar").slice(0, 160)],
          ]}
        />
      </Section>
      <Section title="Hinweise">
        <P>
          Unterzeichnet mit einer einfachen elektronischen Signatur (Art. 25 eIDAS-Verordnung). Die Unterschrift ist als reine Strich-Geometrie gespeichert,
          ohne Zeit- und Druckdaten. Der Inhalts-Hash bezieht sich auf die unterschriebene Fassung (Vorlage, Angaben und Auswahl). Die abgelegte Datei ist
          zusätzlich mit SHA-256 gesichert; der Wert steht im Änderungsprotokoll von SCM Studio.
        </P>
      </Section>
    </PdfPage>
  );
}

export function DemoNote({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <View style={{ borderWidth: 0.8, borderColor: C.accent, padding: 6, marginBottom: 5 * MM }} wrap={false}>
      <Text style={[s.label, { color: C.accent }]}>Demo-Daten</Text>
      <Text style={[s.p, { fontSize: 8.5 }]}>Dieses Dokument enthält Beispielwerte aus der Vorschau von SCM Studio und ist nicht zur Weitergabe bestimmt.</Text>
    </View>
  );
}
