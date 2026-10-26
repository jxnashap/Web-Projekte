"use client";
// Einnahmen und Ausgaben je Monat (netto). Zwei Reihen in fester Reihenfolge (Blau, Orange),
// Legende über dem Diagramm, gewählter Zeitraum grau hinterlegt, Tooltip beim Überfahren, Tabelle als Alternative.
import { Bar, BarChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const SERIES = [
  { key: "einnahmen", label: "Einnahmen", color: "#2a78d6" },
  { key: "ausgaben", label: "Ausgaben", color: "#eb6834" },
] as const;

type Point = { month: string; einnahmen: number; ausgaben: number };

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const axisFmt = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const axisEur = (v: number) => (v === 0 ? "0" : `${axisFmt.format(v)} €`);
const monthShort = (ym: string) => new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "UTC" }).format(new Date(`${ym}-15T12:00:00Z`)).replace(".", "");
const monthLong = (ym: string) => new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-15T12:00:00Z`));

export function FinanceChart({ data, highlight = [] }: { data: Point[]; /** Monate des gewählten Zeitraums (YYYY-MM) */ highlight?: string[] }) {
  const inData = highlight.filter((m) => data.some((d) => d.month === m));
  // ganzes Jahr gewählt: nichts hervorheben (alles wäre grau)
  const shown = inData.length < data.length ? inData : [];
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-muted" aria-hidden>
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2">
            <span className="inline-block size-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        {shown.length > 0 && (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-4 rounded-[3px] bg-fill" />
            gewählter Zeitraum
          </span>
        )}
      </div>
      <div className="h-60 w-full" role="img" aria-label="Balkendiagramm Einnahmen und Ausgaben je Monat, netto">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            {shown.length > 0 && <ReferenceArea x1={shown[0]} x2={shown[shown.length - 1]} fill="var(--color-fill)" fillOpacity={1} ifOverflow="visible" />}
            <XAxis dataKey="month" tickFormatter={monthShort} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--color-muted)" }} interval="preserveStartEnd" />
            <YAxis width={64} tickFormatter={axisEur} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--color-muted)" }} />
            <Tooltip
              cursor={{ fill: "var(--color-sunken)", radius: 6 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-xl border border-line bg-surface px-3 py-2 text-[13px] shadow-[var(--shadow-pop)]">
                    <div className="mb-1 font-semibold">{monthLong(String(label))}</div>
                    {SERIES.map((s) => {
                      const v = payload.find((p) => p.dataKey === s.key)?.value as number | undefined;
                      return (
                        <div key={s.key} className="flex items-center justify-between gap-6 tabular-nums">
                          <span className="inline-flex items-center gap-2 text-muted">
                            <span className="inline-block size-2 rounded-full" style={{ background: s.color }} />
                            {s.label}
                          </span>
                          <span className="font-semibold">{eur.format(v ?? 0)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : null
              }
            />
            {SERIES.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={22} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-[13px]">
        <summary className="-mx-2 cursor-pointer rounded-lg px-2 py-3 font-medium text-ink-2 hover:text-ink">Als Tabelle anzeigen</summary>
        <table className="mt-2 w-full tabular-nums">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">Monat</th>
              <th className="py-1 text-right font-medium">Einnahmen</th>
              <th className="py-1 text-right font-medium">Ausgaben</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month} className="border-t border-line">
                <td className="py-1">{monthLong(d.month)}</td>
                <td className="py-1 text-right">{eur.format(d.einnahmen)}</td>
                <td className="py-1 text-right">{eur.format(d.ausgaben)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
