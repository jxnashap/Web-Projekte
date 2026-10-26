// Drehplan im Drehbuch-Look: Szenen in Courier Prime, sonst ruhiges Weiß mit Logo. Sprache: ihr-Form (Team und Kunde).
import { Text, View } from "@react-pdf/renderer";
import { KeyValues, P, PdfDocument, PdfPage, PdfTable, s, Section, Title } from "@/lib/pdf/components";
import { C, MM } from "@/lib/pdf/theme";
import { lines, type DrehplanData } from "../schema";
import { Bullets, CheckRow, DemoNote, fmtDate } from "./common";
import type { RenderCtx } from "./types";

const weekday = (iso: string) => new Intl.DateTimeFormat("de-DE", { weekday: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

export function DrehplanPdf({ ctx }: { ctx: RenderCtx }) {
  const d = ctx.doc.data as unknown as DrehplanData;
  const snap = ctx.drehplan ?? d.snapshot ?? { videos: [], team: [] };
  const plan = lines(d.zeitplan).map((l) => {
    const m = l.match(/^(\d{1,2}[:.]\d{2})\s*(.*)$/);
    return m ? { zeit: m[1].replace(".", ":"), was: m[2] } : { zeit: "", was: l };
  });
  const zeit = [d.start, d.ende].filter(Boolean).join(" bis ");
  return (
    <PdfDocument title={ctx.doc.title} subject="Drehplan" company={ctx.company}>
      <PdfPage company={ctx.company} kind="Drehplan" reference={fmtDate(d.drehtag)} watermark={ctx.doc.status === "entwurf" ? "Entwurf" : undefined}>
        <DemoNote show={ctx.demo} />
        <Title kicker={`Drehtag · ${weekday(d.drehtag)}, ${fmtDate(d.drehtag)}`} sub={ctx.party?.name ?? ctx.clientName ?? undefined}>
          Drehplan
        </Title>
        <Section title="Eckdaten">
          <KeyValues
            labelWidth={115}
            rows={[
              ["Kunde", ctx.party?.name ?? ctx.clientName ?? "ohne Kunde"],
              ["Datum", `${weekday(d.drehtag)}, ${fmtDate(d.drehtag)}`],
              ...(zeit ? ([["Zeit", `${zeit} Uhr`]] as [string, string][]) : []),
              ["Ort", d.ort || "[PLATZHALTER: Ort eintragen]"],
              ...(d.treffpunkt ? ([["Treffpunkt", d.treffpunkt]] as [string, string][]) : []),
              ["Ansprechperson", [d.ansprechpartner, d.ansprechpartnerTelefon].filter(Boolean).join(" · ") || "[PLATZHALTER]"],
              ["Team", snap.team.length ? snap.team.map((t) => t.name).join(", ") : "noch nicht eingeteilt"],
              ["Videos", snap.videos.length ? `${snap.videos.length} geplant` : "keine Videos mit diesem Drehdatum"],
            ]}
          />
        </Section>
        {plan.length ? (
          <Section title="Zeitplan">
            <PdfTable cols={[{ key: "z", label: "Zeit", width: "18%", render: (r: { zeit: string; was: string }) => r.zeit }, { key: "w", label: "Was", width: "82%", render: (r) => r.was }]} rows={plan} />
          </Section>
        ) : null}
        {snap.videos.map((v, i) => (
          <View key={v.id} style={{ marginBottom: 6 * MM }} wrap>
            <View style={{ flexDirection: "row", alignItems: "baseline", borderBottomWidth: 0.8, borderBottomColor: C.ink, paddingBottom: 3, marginBottom: 4 }} minPresenceAhead={60}>
              <Text style={[s.mono, { fontSize: 9, fontWeight: 700, color: C.accent, width: 62 }]}>{`SZENE ${String(i + 1).padStart(2, "0")}`}</Text>
              <Text style={[s.h2, { marginBottom: 0, flex: 1 }]}>{v.title}</Text>
              {v.format ? <Text style={s.label}>{v.format}</Text> : null}
            </View>
            {v.script ? (
              <View>
                {v.script.hook ? (
                  <Text style={[s.mono, { fontSize: 9.5, color: C.ink, marginBottom: 4, lineHeight: 1.45 }]}>{`HOOK: ${v.script.hook}`}</Text>
                ) : null}
                {v.script.beats.length ? (
                  <PdfTable
                    cols={[
                      { key: "tc", label: "TC", width: "11%", render: (b: { tc: string; label: string; text: string; shot?: string }) => <Text style={[s.mono, { fontSize: 8.5, color: C.ink }]}>{b.tc}</Text> },
                      { key: "l", label: "Abschnitt", width: "18%", render: (b) => <Text style={[s.mono, { fontSize: 8.5, color: C.muted, textTransform: "uppercase" }]}>{b.label}</Text> },
                      { key: "t", label: "Inhalt", width: "48%", render: (b) => <Text style={[s.mono, { fontSize: 9, color: C.ink, lineHeight: 1.4 }]}>{b.text}</Text> },
                      { key: "e", label: "Einstellung", width: "23%", render: (b) => <Text style={[s.mono, { fontSize: 8.5, color: C.ink2, lineHeight: 1.4 }]}>{b.shot ?? ""}</Text> },
                    ]}
                    rows={v.script.beats}
                  />
                ) : null}
              </View>
            ) : (
              <Text style={[s.mono, { fontSize: 9, color: C.muted }]}>Noch kein Skript verknüpft.</Text>
            )}
          </View>
        ))}
        {lines(d.requisiten).length ? (
          <Section title="Requisiten und Material">
            <Bullets items={lines(d.requisiten)} />
          </Section>
        ) : null}
        {lines(d.checkliste).length ? (
          <Section title="Checkliste vor dem Dreh">
            {lines(d.checkliste).map((l, i) => (
              <CheckRow key={i} checked={false} text={l} />
            ))}
          </Section>
        ) : null}
        {d.notizen ? (
          <Section title="Notizen">
            <P>{d.notizen}</P>
          </Section>
        ) : null}
      </PdfPage>
    </PdfDocument>
  );
}
