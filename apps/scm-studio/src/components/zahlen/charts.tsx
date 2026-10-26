"use client";
// Diagramme im ruhigen Stil (große Zahl oben, abgerundete Balken, dünne Linien, wenige Achsen).
// Farben: geprüfte Kategorie-Palette (src/lib/zahlen/palette.ts), Text immer in Textfarben.
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  BarStack,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/cn";
import { fmt, num } from "@/lib/format";
import { AXIS, GRID, INK, SERIES } from "@/lib/zahlen/palette";

// Verlaufslinie in Blau: Rot bleibt Aktionen und Alarmen vorbehalten
const CURVE = SERIES[0];

export type SeriesDef = { id: number; name: string; color: string };
export type Point = Record<string, number | string>;

const tickStyle = { fill: AXIS, fontSize: 11 };

/**
 * Runde Achsenschritte (1, 2, 2,5, 5 × 10^n) für 3 bis 5 Linien, Start bei 0.
 * Liefert die Werte und eine Formatierung in einheitlicher Einheit (alle in Tsd. oder alle als Zahl).
 */
export function niceAxis(max: number, target = 4): { ticks: number[]; format: (v: number) => string } {
  const m = Math.max(max, 1);
  const raw = m / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * pow).find((s) => s >= raw) ?? 10 * pow;
  const top = Math.ceil(m / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => Math.round(i * step * 100) / 100);
  const format =
    top >= 1_000_000
      ? (v: number) => (v === 0 ? "0" : `${num(Math.round(v / 100_000) / 10)} Mio.`)
      : top >= 10_000
        ? (v: number) => (v === 0 ? "0" : `${num(Math.round(v / 100) / 10)} Tsd.`)
        : (v: number) => num(v);
  return { ticks, format };
}

const labelFor = (p: Point | undefined, unit: "tag" | "woche", partialKey?: string) => {
  if (!p) return "";
  if (unit === "tag") return fmt(String(p.from), "EEEE, d. MMMM");
  const range = `${fmt(String(p.from), "d. MMM")} bis ${fmt(String(p.to), "d. MMM")}`;
  return p.key === partialKey ? `${range} (Woche läuft noch)` : range;
};

function SeriesTooltip({
  active,
  payload,
  series,
  unit,
  partialKey,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  series: SeriesDef[];
  unit: "tag" | "woche";
  partialKey?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as Point | undefined;
  const rows = series
    .map((s) => ({ s, v: Number(point?.[`c${s.id}`] ?? 0) }))
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v);
  const total = rows.reduce((a, r) => a + r.v, 0);
  return (
    <div className="min-w-48 rounded-xl bg-surface px-3 py-2.5 text-[12px] shadow-[var(--shadow-pop)]">
      <div className="text-muted">{labelFor(point, unit, partialKey)}</div>
      <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">{num(total)} Aufrufe</div>
      {rows.length > 1 && (
        <ul className="mt-1.5 grid gap-1">
          {rows.map(({ s, v }) => (
            <li key={s.id} className="flex items-center gap-2">
              <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
              <span className="font-semibold tabular-nums text-ink">{num(v)}</span>
              <span className="truncate text-muted">{s.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Aufrufe je Tag/Woche, gestapelt nach Kunde (Standard) oder als Linien je Kunde. */
export function ViewsByClientChart({
  data,
  series,
  unit,
  partialKey,
}: {
  data: Point[];
  series: SeriesDef[];
  unit: "tag" | "woche";
  /** Schlüssel einer angebrochenen Woche (wird im Tooltip so benannt) */
  partialKey?: string;
}) {
  const [mode, setMode] = useState<"balken" | "linien">("balken");
  const tick = (v: string) => (unit === "tag" ? fmt(v, "d.") : fmt(v, "d. MMM"));
  const max = Math.max(
    0,
    ...data.map((p) =>
      mode === "balken" ? series.reduce((a, s) => a + Number(p[`c${s.id}`] ?? 0), 0) : Math.max(0, ...series.map((s) => Number(p[`c${s.id}`] ?? 0))),
    ),
  );
  const y = niceAxis(max);
  const common = { data, margin: { top: 8, right: 4, bottom: 0, left: 4 } };
  const tooltip = (p: { active?: boolean; payload?: unknown }) => (
    <SeriesTooltip active={p.active} payload={p.payload as ReadonlyArray<{ payload?: unknown }>} series={series} unit={unit} partialKey={partialKey} />
  );
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={GRID} />
      <XAxis dataKey="key" tickFormatter={tick} tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} padding={{ left: 8, right: 8 }} />
      <YAxis
        orientation="right"
        tickFormatter={y.format}
        tick={tickStyle}
        tickLine={false}
        axisLine={false}
        width={58}
        ticks={y.ticks}
        domain={[0, y.ticks.at(-1) ?? "auto"]}
        allowDecimals={false}
      />
    </>
  );
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <div className="inline-flex rounded-[9px] bg-fill p-[2px]" role="group" aria-label="Darstellung">
          {(["balken", "linien"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "hit-lg h-8 min-w-16 rounded-[7px] px-3 text-[13px] transition-[background-color,box-shadow] sm:h-7",
                mode === m ? "bg-surface font-semibold text-ink shadow-[var(--shadow-thumb)]" : "font-medium text-ink hover:bg-fill-2",
              )}
            >
              {m === "balken" ? "Balken" : "Linien"}
            </button>
          ))}
        </div>
      </div>
      <div className="h-64 w-full" role="img" aria-label={`Aufrufe pro ${unit === "tag" ? "Tag" : "Woche"} nach Kunde`}>
        <ResponsiveContainer width="100%" height="100%">
          {mode === "balken" ? (
            <BarChart {...common} barCategoryGap={unit === "tag" && data.length > 20 ? "18%" : "28%"}>
              {axes}
              <Tooltip cursor={{ fill: "rgba(17,17,18,0.04)" }} content={tooltip} />
              <BarStack radius={[4, 4, 0, 0]}>
                {series.map((s) => (
                  <Bar key={s.id} dataKey={`c${s.id}`} name={s.name} fill={s.color} stroke="#ffffff" strokeWidth={1} maxBarSize={24} isAnimationActive={false} />
                ))}
              </BarStack>
            </BarChart>
          ) : (
            <LineChart {...common}>
              {axes}
              <Tooltip cursor={{ stroke: AXIS, strokeWidth: 1 }} content={tooltip} />
              {series.map((s) => (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey={`c${s.id}`}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: "#ffffff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Kumulierter Verlauf eines Videos: Linie mit zarter Fläche, Messpunkte als Punkte. */
export function VideoCurveChart({ data }: { data: { day: string; views: number; measured: number | null }[] }) {
  const y = niceAxis(Math.max(0, ...data.map((d) => d.views)));
  return (
    <div className="h-64 w-full" role="img" aria-label="Aufrufe insgesamt im Verlauf">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="viewsWash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CURVE} stopOpacity={0.14} />
              <stop offset="100%" stopColor={CURVE} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="day"
            tickFormatter={(v: string) => fmt(v, "d. MMM")}
            tick={tickStyle}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
            padding={{ left: 24, right: 8 }}
          />
          <YAxis
            orientation="right"
            tickFormatter={y.format}
            tick={tickStyle}
            tickLine={false}
            axisLine={false}
            width={58}
            ticks={y.ticks}
            domain={[0, y.ticks.at(-1) ?? "auto"]}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: AXIS, strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as { day: string; views: number; measured: number | null };
              return (
                <div className="rounded-xl bg-surface px-3 py-2 text-[12px] shadow-[var(--shadow-pop)]">
                  <div className="text-muted">{fmt(p.day, "EEEE, d. MMMM")}</div>
                  <div className="text-[15px] font-semibold tabular-nums text-ink">{num(p.views)} Aufrufe</div>
                  <div className="text-muted">{p.measured !== null ? "gemessen" : "zwischen zwei Messungen geschätzt"}</div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="views"
            stroke={CURVE}
            strokeWidth={2}
            fill="url(#viewsWash)"
            isAnimationActive={false}
            dot={(props: { cx?: number; cy?: number; index?: number; payload?: { measured: number | null } }) =>
              props.payload?.measured !== null && props.cx !== undefined && props.cy !== undefined ? (
                <circle key={props.index} cx={props.cx} cy={props.cy} r={4} fill={CURVE} stroke="#ffffff" strokeWidth={2} />
              ) : (
                <g key={props.index} />
              )
            }
            activeDot={{ r: 5, fill: INK, stroke: "#ffffff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Kleine Wochenbalken (z. B. in Kennzahl-Kacheln), aktueller Balken dunkel. */
export function Sparkbars({ values }: { values: number[] }) {
  const data = values.map((v, i) => ({ i, v }));
  return (
    <div className="h-10 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap="20%">
          <Bar dataKey="v" radius={[2, 2, 0, 0]} isAnimationActive={false} shape={(p: { x?: number; y?: number; width?: number; height?: number; index?: number }) => (
            <rect x={p.x} y={p.y} width={p.width} height={Math.max(p.height ?? 0, 1)} rx={2} fill={p.index === values.length - 1 ? INK : GRID} />
          )} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
