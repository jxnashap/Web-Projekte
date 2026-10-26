// Drehbuch als PDF: weißes Papier, Logo, Ablauf als Tabelle mit Timecode (Schreibmaschine wie die Website).
import "server-only";
import type { Script } from "@/db/schema";
import { KeyValues, PdfDocument, PdfPage, PdfTable, Section, Text, Title, View, s } from "@/lib/pdf/components";
import { C } from "@/lib/pdf/theme";
import { dateDe } from "@/lib/format";
import type { Company } from "@/lib/settings";
import { videoStatus } from "@/lib/labels";
import { lengthLabel, mergeHookAndCta, scriptStatusLabel } from "./schema";

type Beat = { tc: string; label: string; text: string; shot?: string; action?: string; overlay?: string; sound?: string; cut?: string };

/** Zusatzzeilen einer Szene (Creative Engine), in Klammern unter dem Haupttext. */
const extras = (pairs: [string, string | undefined][]) =>
  pairs.filter(([, v]) => v?.trim()).map(([k, v]) => `${k}: ${v!.trim()}`).join("\n");

// Öffnende Anführungszeichen gehören an das folgende Wort (ein Leerzeichen dahinter wäre eine Bruchstelle am Zeilenende).
const bindQuotes = (v: string) => v.replace(/([„‚])\s+/g, "$1");

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
  // Hook und Aufruf stehen als Abschnitte im Ablauf (ältere Skripte: Felder werden dort eingesetzt), nicht doppelt
  const beats: Beat[] = mergeHookAndCta(script.beats, script.hook, script.cta);
  const mono = { fontFamily: "Courier Prime", fontSize: 9.5, lineHeight: 1.45, color: C.ink };
  return (
    <PdfDocument title={`Drehbuch: ${t(script.title)}`} subject="Drehbuch" company={company}>
      <PdfPage showBank={false} company={company} kind="Drehbuch" reference={clientName ?? undefined} watermark={script.status === "final" ? undefined : "Entwurf"}>
        <Title kicker={`Drehbuch${script.format ? ` · ${t(script.format)}` : ""}`}>{t(script.title)}</Title>
        <Section>
          <KeyValues
            rows={[
              ["Kunde", t(clientName) || "offen"],
              ["Format", t(script.format) || "offen"],
              ["Länge", lengthLabel(beats) ?? "offen"],
              ["Video", video ? `${t(video.title)} (${videoStatus(video.status).label}${video.shootDate ? `, Dreh ${dateDe(video.shootDate)}` : ""})` : "nicht verknüpft"],
              ["Status", scriptStatusLabel(script.status)],
              ["Stand", dateDe(script.updatedAt)],
            ]}
          />
        </Section>
        <Section title="Ablauf">
          <PdfTable<Beat>
            cols={[
              { key: "tc", label: "Zeit", width: "10%", render: (b) => <Text style={[mono, { color: C.accent, fontWeight: 700 }]}>{t(b.tc)}</Text> },
              { key: "label", label: "Abschnitt", width: "18%", render: (b) => <Text style={[mono, { fontWeight: 700, fontSize: 8.5 }]}>{t(b.label)}</Text> },
              {
                key: "text",
                label: "Text und Handlung",
                width: "50%",
                render: (b) => {
                  const more = extras([["Handlung", b.action], ["Text im Bild", b.overlay]]);
                  return (
                    <View style={{ paddingRight: 8 }}>
                      <Text style={mono}>{bindQuotes(t(b.text)) || " "}</Text>
                      {more ? <Text style={[s.p, { fontSize: 8, color: C.muted, marginTop: 2 }]}>{bindQuotes(t(more))}</Text> : null}
                    </View>
                  );
                },
              },
              {
                key: "shot",
                label: "Kamera und Schnitt",
                width: "22%",
                render: (b) => <Text style={[s.p, { fontSize: 8.5 }]}>{bindQuotes(t([b.shot, extras([["Ton", b.sound], ["Schnitt", b.cut]])].filter(Boolean).join("\n")))}</Text>,
              },
            ]}
            rows={beats}
          />
        </Section>
        {script.production ? (
          <View wrap={false}>
            <Section title="Drehaufwand">
              <KeyValues
                rows={[
                  ["Personen", `${script.production.actors}${script.production.roles.length ? ` (${t(script.production.roles.join(", "))})` : ""}`],
                  ["Drehort", t(script.production.location) || "offen"],
                  ["Requisiten", t(script.production.props.join(", ")) || "keine"],
                  ["Drehzeit", `ca. ${script.production.minutes} Minuten`],
                ]}
              />
            </Section>
          </View>
        ) : null}
        {script.caption ? (
          <View wrap={false}>
            <Section title="Caption">
              <Text style={[s.p, { color: C.ink }]}>{t(script.caption)}</Text>
            </Section>
          </View>
        ) : null}
      </PdfPage>
    </PdfDocument>
  );
}
