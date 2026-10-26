// Drehbuch als PDF: weißes Papier, Logo, Ablauf als Tabelle mit Timecode (Schreibmaschine wie die Website).
import "server-only";
import type { Script } from "@/db/schema";
import { KeyValues, PdfDocument, PdfPage, PdfTable, Section, Text, Title, View, s } from "@/lib/pdf/components";
import { C } from "@/lib/pdf/theme";
import { dateDe } from "@/lib/format";
import type { Company } from "@/lib/settings";
import { videoStatus } from "@/lib/labels";

type Beat = Script["beats"][number];

// Emojis kann react-pdf ohne Online-Emoji-Quelle nicht darstellen (sonst Zeichensalat und eine nicht eingebettete Ersatzschrift)
const t = (v: string | null | undefined) =>
  (v ?? "")
    .replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

export function DrehbuchPdf({
  script,
  clientName,
  video,
  company,
}: {
  script: Script;
  clientName: string | null;
  video: { title: string; status: string; shootDate: string | null } | null;
  company: Company | null;
}) {
  const last = script.beats[script.beats.length - 1]?.tc;
  const mono = { fontFamily: "Courier Prime", fontSize: 9.5, lineHeight: 1.45, color: C.ink };
  return (
    <PdfDocument title={`Drehbuch: ${t(script.title)}`} subject="Drehbuch" company={company}>
      <PdfPage company={company} kind="Drehbuch" reference={clientName ?? undefined} watermark={script.status === "final" ? undefined : "Entwurf"}>
        <Title kicker={`Drehbuch${script.format ? ` · ${t(script.format)}` : ""}`}>{t(script.title)}</Title>
        <Section>
          <KeyValues
            rows={[
              ["Kunde", t(clientName) || "offen"],
              ["Format", t(script.format) || "offen"],
              ["Länge", last ? `ca. ${last} plus Aufruf` : "offen"],
              ["Video", video ? `${t(video.title)} (${videoStatus(video.status).label}${video.shootDate ? `, Dreh ${dateDe(video.shootDate)}` : ""})` : "nicht verknüpft"],
              ["Status", script.status === "final" ? "Final" : "Entwurf"],
              ["Stand", dateDe(script.updatedAt)],
            ]}
          />
        </Section>
        {script.hook ? (
          <View style={{ borderLeftWidth: 2, borderLeftColor: C.accent, paddingLeft: 10, marginBottom: 18 }} wrap={false}>
            <Text style={[s.label, { color: C.accent }]}>Hook</Text>
            <Text style={{ fontFamily: "Courier Prime", fontSize: 12.5, lineHeight: 1.4, color: C.ink, marginTop: 3 }}>{t(script.hook)}</Text>
          </View>
        ) : null}
        <Section title="Ablauf">
          <PdfTable<Beat>
            cols={[
              { key: "tc", label: "Zeit", width: "10%", render: (b) => <Text style={[mono, { color: C.accent, fontWeight: 700 }]}>{t(b.tc)}</Text> },
              { key: "label", label: "Abschnitt", width: "18%", render: (b) => <Text style={[mono, { fontWeight: 700, fontSize: 8.5 }]}>{t(b.label)}</Text> },
              { key: "text", label: "Text und Handlung", width: "47%", render: (b) => <Text style={mono}>{t(b.text) || " "}</Text> },
              { key: "shot", label: "Einstellung", width: "25%", render: (b) => <Text style={[s.p, { fontSize: 8.5 }]}>{t(b.shot)}</Text> },
            ]}
            rows={script.beats}
          />
        </Section>
        {script.cta || script.caption ? (
          <View style={{ flexDirection: "row", gap: 18 }} wrap={false}>
            <View style={{ flex: 1 }}>
              <Section title="Aufruf">
                <Text style={mono}>{t(script.cta) || "offen"}</Text>
              </Section>
            </View>
            <View style={{ flex: 1 }}>
              <Section title="Caption">
                <Text style={[s.p, { color: C.ink }]}>{t(script.caption) || "offen"}</Text>
              </Section>
            </View>
          </View>
        ) : null}
      </PdfPage>
    </PdfDocument>
  );
}
