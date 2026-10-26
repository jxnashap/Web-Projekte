// Monatsbericht für Kunden: weiß, ruhig, wenige klare Zahlen. Sprache: ihr-Form (wie SCM mit Kunden spricht).
import { Rect, Svg, Text, View } from "@react-pdf/renderer";
import { P, PdfDocument, PdfPage, PdfTable, s, Section, Title } from "@/lib/pdf/components";
import { C, MM } from "@/lib/pdf/theme";
import { interactionsOf, type MonatsberichtData, type ReportSnapshot, type ReportTotals, type ReportVideo } from "../schema";
import { DemoNote, fmtDate } from "./common";
import type { RenderCtx } from "./types";

const nf = new Intl.NumberFormat("de-DE");
// Raten immer mit einer Nachkommastelle (3,0 % neben 3,7 %), Veränderungen ebenso
const pf = new Intl.NumberFormat("de-DE", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
const monthName = (ym: string) => new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-15T12:00:00Z`));

function delta(cur: number, prev: number): string {
  if (!prev) return cur ? "Vormonat ohne Werte" : "";
  const d = (cur - prev) / prev;
  return `${d >= 0 ? "+" : ""}${pf.format(d)} zum Vormonat`;
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={{ width: "23.5%", borderWidth: 0.6, borderColor: C.line, padding: 7 }}>
      <Text style={s.label}>{label}</Text>
      <Text style={{ fontWeight: 800, fontSize: 18, color: C.ink, marginTop: 4 }}>{value}</Text>
      {sub ? <Text style={[s.small, { marginTop: 2 }]}>{sub}</Text> : null}
    </View>
  );
}

function rate(t: ReportTotals) {
  return t.views ? t.interactions / t.views : 0;
}

function Bars({ videos }: { videos: ReportVideo[] }) {
  const top = videos.filter((v) => v.views > 0).slice(0, 8);
  if (!top.length) return <P>Für diesen Monat sind noch keine Aufrufe erfasst.</P>;
  const max = Math.max(...top.map((v) => v.views));
  const W = 260;
  return (
    <View>
      {top.map((v, i) => (
        <View key={v.id} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }} wrap={false}>
          <Text style={[s.p, { width: 190, fontSize: 8.5, color: C.ink, paddingRight: 6 }]}>{v.title.length > 44 ? `${v.title.slice(0, 43)}…` : v.title}</Text>
          <Svg width={W} height={9}>
            <Rect x={0} y={0} width={W} height={9} fill={C.soft} />
            <Rect x={0} y={0} width={Math.max(2, (v.views / max) * W)} height={9} fill={i === 0 ? C.accent : C.ink} />
          </Svg>
          <Text style={[s.p, { width: 50, textAlign: "right", fontSize: 8.5, color: C.ink }]}>{nf.format(v.views)}</Text>
        </View>
      ))}
      <Text style={[s.small, { marginTop: 2 }]}>Aufrufe je Video, bestes Video rot markiert</Text>
    </View>
  );
}

export function MonatsberichtPdf({ ctx }: { ctx: RenderCtx }) {
  const d = ctx.doc.data as unknown as MonatsberichtData;
  const r: ReportSnapshot | undefined = ctx.report ?? d.snapshot;
  const name = ctx.party?.name ?? ctx.clientName ?? "";
  const best = r?.videos.find((v) => v.views > 0) ?? null;
  const posted = r?.videos.filter((v) => v.postDate && v.postDate.startsWith(d.month)) ?? [];
  return (
    <PdfDocument title={ctx.doc.title} subject="Monatsbericht" company={ctx.company}>
      <PdfPage company={ctx.company} kind="Monatsbericht" reference={monthName(d.month)} watermark={ctx.doc.status === "entwurf" ? "Entwurf" : undefined}>
        <DemoNote show={Boolean(r?.demo)} />
        <Title kicker={`Bericht · ${monthName(d.month)}`} sub={name}>
          Euer Monat
        </Title>
        {!r ? (
          <P>Keine Daten.</P>
        ) : (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 * MM }}>
              <Kpi label="Videos online" value={nf.format(r.posted)} sub={r.kontingent ? `${r.kontingent.fertig} von ${r.kontingent.soll} im Paket fertig` : `${r.produced} fertig`} />
              <Kpi label="Aufrufe" value={nf.format(r.totals.views)} sub={delta(r.totals.views, r.prevTotals.views)} />
              <Kpi label="Interaktionen" value={nf.format(r.totals.interactions)} sub={delta(r.totals.interactions, r.prevTotals.interactions)} />
              <Kpi label="Interaktionsrate" value={pf.format(rate(r.totals))} sub="Interaktionen je Aufruf" />
            </View>
            {d.highlights ? (
              <Section title="Das Wichtigste">
                <P>{d.highlights}</P>
              </Section>
            ) : null}
            {best ? (
              <Section title="Bestes Video">
                <View style={{ borderLeftWidth: 2, borderLeftColor: C.accent, paddingLeft: 8 }} wrap={false}>
                  <Text style={[s.h3, { fontSize: 11 }]}>{best.title}</Text>
                  <Text style={s.p}>
                    {`${nf.format(best.views)} Aufrufe · ${nf.format(best.likes)} Likes · ${nf.format(best.comments)} Kommentare${best.shares ? ` · ${nf.format(best.shares)} geteilt` : ""}${best.saves ? ` · ${nf.format(best.saves)} gespeichert` : ""}`}
                  </Text>
                  {best.postDate ? <Text style={s.small}>{`online seit ${fmtDate(best.postDate)}${best.format ? ` · Format ${best.format}` : ""}`}</Text> : null}
                </View>
              </Section>
            ) : null}
            <Section title="Aufrufe im Vergleich">
              <Bars videos={r.videos} />
            </Section>
            <Section title="Alle Videos des Monats">
              {r.videos.length ? (
                <PdfTable
                  cols={[
                    { key: "t", label: "Video", width: "36%", render: (v: ReportVideo) => v.title },
                    { key: "p", label: "Online", width: "12%", render: (v) => (v.postDate ? fmtDate(v.postDate).slice(0, 6) : "geplant") },
                    { key: "v", label: "Aufrufe", width: "12%", align: "right", render: (v) => nf.format(v.views) },
                    { key: "r", label: "Reichweite", width: "13%", align: "right", render: (v) => (v.reach !== null ? nf.format(v.reach) : "") },
                    { key: "l", label: "Likes", width: "9%", align: "right", render: (v) => nf.format(v.likes) },
                    { key: "c", label: "Komm.", width: "9%", align: "right", render: (v) => nf.format(v.comments) },
                    { key: "i", label: "Rate", width: "9%", align: "right", render: (v) => (v.views ? pf.format(interactionsOf(v) / v.views) : "") },
                  ]}
                  rows={r.videos}
                />
              ) : (
                <P>In diesem Monat gab es keine Videos.</P>
              )}
              {/* Quelle direkt unter der Tabelle, sonst steht die eine Zeile womöglich allein auf einer neuen Seite */}
              <Text style={[s.small, { marginTop: 2 * MM }]}>
                {`Zahlen laut Plattform-Statistik, Stand ${r.stand ? fmtDate(r.stand) : "ohne Messwert"}. Interaktionen = Likes, Kommentare, geteilte und gespeicherte Beiträge. ${posted.length !== r.videos.length ? "Die Tabelle enthält auch Videos aus dem Paket dieses Monats, die erst später online gehen." : ""}`}
              </Text>
            </Section>
            {r.prevTotals.videos ? (
              <Section title="Vormonat zum Vergleich">
                <P>
                  {`${r.prevTotals.videos} ${r.prevTotals.videos === 1 ? "Video" : "Videos"} online, ${nf.format(r.prevTotals.views)} Aufrufe, ${nf.format(r.prevTotals.interactions)} Interaktionen, Interaktionsrate ${pf.format(rate(r.prevTotals))}.`}
                </P>
              </Section>
            ) : null}
            {d.ausblick ? (
              <Section title="Ausblick">
                <P>{d.ausblick}</P>
              </Section>
            ) : null}
          </>
        )}
      </PdfPage>
    </PdfDocument>
  );
}
