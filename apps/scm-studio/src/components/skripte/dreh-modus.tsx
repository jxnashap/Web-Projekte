"use client";
// Drehmodus fürs Set: große Dialoge, Szenen abhaken, Requisiten-Checkliste und Shotlist.
// Der Haken-Stand liegt nur auf diesem Gerät (localStorage) und gilt für diesen Stand des Skripts.
import { Check, Clapperboard, ListChecks, MapPin, RotateCcw, Users } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Production, ScriptBeat } from "@/db/schema";
import { cn } from "@/lib/cn";

type State = { scenes: number[]; props: string[] };
const EMPTY: State = { scenes: [], props: [] };
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: State }>();

function read(key: string): State {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    /* Speicher gesperrt */
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value;
  let value = EMPTY;
  try {
    value = raw ? { ...EMPTY, ...(JSON.parse(raw) as State) } : EMPTY;
  } catch {
    value = EMPTY;
  }
  cache.set(key, { raw, value });
  return value;
}

function write(key: string, s: State) {
  try {
    localStorage.setItem(key, JSON.stringify(s));
  } catch {
    cache.set(key, { raw: JSON.stringify(s), value: s });
  }
  listeners.forEach((l) => l());
}

export function DrehModus({
  scriptId,
  version,
  title,
  beats,
  production,
}: {
  scriptId: number;
  version: string;
  title: string;
  beats: ScriptBeat[];
  production: Production | null;
}) {
  const key = `scm.dreh.${scriptId}.${version}`;
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => e.key === key && cb();
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", onStorage);
    };
  }, [key]);
  const state = useSyncExternalStore(subscribe, () => read(key), () => EMPTY);
  const toggleScene = (i: number) => write(key, { ...state, scenes: state.scenes.includes(i) ? state.scenes.filter((x) => x !== i) : [...state.scenes, i] });
  const toggleProp = (p: string) => write(key, { ...state, props: state.props.includes(p) ? state.props.filter((x) => x !== p) : [...state.props, p] });
  const doneCount = state.scenes.filter((i) => i < beats.length).length;
  const props = production?.props ?? [];

  return (
    <div className="grid gap-5">
      <Card className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[20px] font-bold tracking-[-0.02em]">{title}</h2>
            <p className="text-[15px] text-muted">
              {doneCount} von {beats.length} Szenen im Kasten
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => write(key, EMPTY)} disabled={doneCount === 0 && state.props.length === 0}>
            <RotateCcw className="size-4" aria-hidden /> Zurücksetzen
          </Button>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-fill" aria-hidden>
          <div className="h-full rounded-full bg-ok transition-[width] duration-300" style={{ width: `${beats.length ? (doneCount / beats.length) * 100 : 0}%` }} />
        </div>
        {production && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" aria-hidden /> {production.actors} {production.actors === 1 ? "Person" : "Personen"}
              {production.roles.length ? `: ${production.roles.join(", ")}` : ""}
            </span>
            {production.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden /> {production.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clapperboard className="size-4" aria-hidden /> ca. {production.minutes} Minuten
            </span>
          </div>
        )}
      </Card>

      {props.length > 0 && (
        <Card className="grid gap-3 p-5">
          <h3 className="inline-flex items-center gap-2 text-[17px] font-semibold">
            <ListChecks className="size-5" aria-hidden /> Requisiten
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {props.map((p) => (
              <li key={p}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-fill-2 px-3 text-[16px] has-checked:text-muted has-checked:line-through">
                  <input type="checkbox" checked={state.props.includes(p)} onChange={() => toggleProp(p)} className="size-5 accent-[var(--color-ok)]" />
                  {p}
                </label>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ol className="grid gap-4">
        {beats.map((b, i) => {
          const done = state.scenes.includes(i);
          return (
            <li key={i}>
              <Card className={cn("grid gap-3 p-5 transition-opacity", done && "opacity-55")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-script text-[14px] font-bold tabular-nums text-accent-ink">
                      Szene {String(i + 1).padStart(2, "0")} · {b.tc}
                    </div>
                    <div className="text-[17px] font-semibold">{b.label}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleScene(i)}
                    aria-pressed={done}
                    className={cn(
                      "inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-colors",
                      done ? "bg-ok text-white" : "bg-fill text-ink hover:bg-[rgb(120_120_128/0.18)]",
                    )}
                  >
                    <Check className="size-5" aria-hidden /> {done ? "Im Kasten" : "Abhaken"}
                  </button>
                </div>
                {b.text && <p className="whitespace-pre-line font-script text-[22px] leading-snug text-ink sm:text-[26px]">{b.text}</p>}
                <dl className="grid gap-1.5 text-[15px] text-ink-2 sm:grid-cols-2">
                  {b.shot && <Row k="Kamera" v={b.shot} />}
                  {b.action && <Row k="Handlung" v={b.action} />}
                  {b.overlay && <Row k="Text im Bild" v={b.overlay} />}
                  {b.sound && <Row k="Ton" v={b.sound} />}
                  {b.cut && <Row k="Schnitt" v={b.cut} />}
                </dl>
              </Card>
            </li>
          );
        })}
      </ol>

      {beats.some((b) => b.shot) && (
        <Card className="grid gap-3 p-5">
          <h3 className="text-[17px] font-semibold">Shotlist</h3>
          <ol className="grid gap-1.5 text-[15px]">
            {beats.map((b, i) =>
              b.shot ? (
                <li key={i} className="flex gap-3">
                  <span className="w-14 shrink-0 font-script font-bold tabular-nums text-accent-ink">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-ink-2">{b.shot}</span>
                </li>
              ) : null,
            )}
          </ol>
        </Card>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="inline font-semibold text-ink">{k}: </dt>
      <dd className="inline">{v}</dd>
    </div>
  );
}
