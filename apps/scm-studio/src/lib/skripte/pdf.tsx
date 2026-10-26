// Drehbuch als PDF: weißes Papier, Logo, Ablauf als Tabelle mit Timecode (Schreibmaschine wie die Website).
import "server-only";
import type { Script } from "@/db/schema";
import { KeyValues, Note, PdfDocument, PdfPage, PdfTable, Section, Text, Title, View, s } from "@/lib/pdf/components";
import { C } from "@/lib/pdf/theme";
import { dateDe } from "@/lib/format";
import type { Company } from "@/lib/settings";
import { videoStatus } from "@/lib/labels";

type Beat = Script["beats"][number];

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
    <PdfDocument title={`Drehbuch: ${script.title}`} subject="Drehbuch" company={company}>
      <PdfPage company={company} kind="Drehbuch" reference={clientName ?? undefined} watermark={script.status === "final" ? undefined : "Entwurf"}>
        <Title kicker={`Drehbuch${script.format ? ` · ${script.format}` : ""}`}>{script.title}</Title>
        <Section>
          <KeyValues
            rows={[
              ["Kunde", clientName ?? "offen"],
              ["Format", script.format ?? "offen"],
              ["Länge", last ? `ca. ${last} plus Aufruf` : "offen"],
              ["Video", video ? `${video.title} (${videoStatus(video.status).label}${video.shootDate ? `, Dreh ${dateDe(video.shootDate)}` : ""})` : "nicht verknüpft"],
              ["Status", script.status === "final" ? "Final" : "Entwurf"],
              ["Stand", dateDe(script.updatedAt)],
            ]}
          />
        </Section>
        {script.hook ? (
          <View style={{ borderLeftWidth: 2, borderLeftColor: C.accent, paddingLeft: 10, marginBottom: 18 }} wrap={false}>
            <Text style={[s.label, { color: C.accent }]}>Hook</Text>
            <Text style={{ fontFamily: "Courier Prime", fontSize: 12.5, lineHeight: 1.4, color: C.ink, marginTop: 3 }}>{script.hook}</Text>
          </View>
        ) : null}
        <Section title="Ablauf">
          <PdfTable<Beat>
            cols={[
              { key: "tc", label: "Zeit", width: "11%", render: (b) => <Text style={[mono, { color: C.accent, fontWeight: 700 }]}>{b.tc}</Text> },
              { key: "label", label: "Abschnitt", width: "17%", render: (b) => <Text style={[mono, { fontWeight: 700, fontSize: 8.5 }]}>{(b.label || "").toUpperCase()}</Text> },
              { key: "text", label: "Text und Handlung", width: "47%", render: (b) => <Text style={mono}>{b.text || " "}</Text> },
              { key: "shot", label: "Einstellung", width: "25%", render: (b) => <Text style={[s.p, { fontSize: 8.5 }]}>{b.shot ?? ""}</Text> },
            ]}
            rows={script.beats}
          />
        </Section>
        {script.cta ? (
          <Section title="Aufruf">
            <Text style={mono}>{script.cta}</Text>
          </Section>
        ) : null}
        {script.caption ? (
          <Section title="Caption">
            <Text style={[s.p, { color: C.ink }]}>{script.caption}</Text>
          </Section>
        ) : null}
        {script.status !== "final" ? <Note>Entwurf. Vor dem Dreh mit dem Kunden abstimmen und als final markieren.</Note> : null}
      </PdfPage>
    </PdfDocument>
  );
}
