// Drehplan im Drehbuch-Look: Szenen in Courier Prime, sonst ruhiges Weiß mit Logo. Sprache: ihr-Form (Team und Kunde).
import { Text, View } from "@react-pdf/renderer";
import { KeyValues, P, PdfDocument, PdfPage, s, Section, Title } from "@/lib/pdf/components";
import { C, MM, PAGE } from "@/lib/pdf/theme";
import { lines, type DrehplanData } from "../schema";
import { Bullets, CheckRow, DemoNote, fmtDate } from "./common";
import type { RenderCtx } from "./types";

const weekday = (iso: string) => new Intl.DateTimeFormat("de-DE", { weekday: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

// Tabellen mit festen Breiten in Punkt (aus der Inhaltsbreite), Abstand als Rand am Text: Prozentbreiten mit
// Innenabstand am View misst react-pdf zu schmal, dann brechen Wörter mitten im Wort um.
const CONTENT_W = 595.28 - 2 * PAGE.marginX;
const GAP = 10;
type ColDef = { label: string; width: number };
/** Restbreite für die flexible Spalte */
const rest = (...fixed: number[]) => CONTENT_W - fixed.reduce((a, b) => a + b + GAP, 0);

function TableHead({ cols }: { cols: ColDef[] }) {
  return (
    <View fixed style={{ flexDirection: "row", borderBottomWidth: 0.8, borderBottomColor: C.ink, paddingBottom: 4, marginBottom: 2 }}>
      {cols.map((c, i) => (
        <Text key={c.label} style={[s.label, { width: c.width }, i < cols.length - 1 ? { marginRight: GAP } : {}]}>
          {c.label}
        </Text>
      ))}
    </View>
  );
}

function TableRow({ children }: { children: React.ReactNode }) {
  return (
    <View wrap={false} style={{ flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
      {children}
    </View>
  );
}

const W = { tc: 36, label: 78, shot: 128, zeit: 60 };
const W_TEXT = rest(W.tc, W.label, W.shot);
const W_WAS = rest(W.zeit);
const SCRIPT_COLS: ColDef[] = [
  { label: "TC", width: W.tc },
  { label: "Abschnitt", width: W.label },
  { label: "Inhalt", width: W_TEXT },
  { label: "Einstellung", width: W.shot },
];
const scriptText = { fontFamily: "Courier Prime", fontSize: 8.5, lineHeight: 1.4, color: C.ink };

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
      <PdfPage showBank={false} company={ctx.company} kind="Drehplan" reference={fmtDate(d.drehtag)} watermark={ctx.doc.status === "entwurf" ? "Entwurf" : undefined}>
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
            <TableHead cols={[{ label: "Zeit", width: W.zeit }, { label: "Was", width: W_WAS }]} />
            {plan.map((r, i) => (
              <TableRow key={i}>
                <Text style={[s.p, { width: W.zeit, marginRight: GAP, color: C.ink }]}>{r.zeit}</Text>
                <Text style={[s.p, { width: W_WAS, color: C.ink }]}>{r.was}</Text>
              </TableRow>
            ))}
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
                  <View>
                    <TableHead cols={SCRIPT_COLS} />
                    {v.script.beats.map((b, j) => (
                      <TableRow key={j}>
                        <Text style={[scriptText, { width: W.tc, marginRight: GAP }]}>{b.tc}</Text>
                        <Text style={[scriptText, { width: W.label, marginRight: GAP, color: C.muted, textTransform: "uppercase" }]}>{b.label}</Text>
                        <Text style={[scriptText, { width: W_TEXT, marginRight: GAP }]}>{b.text}</Text>
                        <Text style={[scriptText, { width: W.shot, color: C.ink2 }]}>{b.shot ?? ""}</Text>
                      </TableRow>
                    ))}
                  </View>
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
