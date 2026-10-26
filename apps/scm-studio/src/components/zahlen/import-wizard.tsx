"use client";
// CSV-Import in drei Schritten: Datei wählen → Spalten zuordnen → prüfen und importieren.
import Papa from "papaparse";
import { CircleAlert, CircleCheck, Download, FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { num } from "@/lib/format";
import { checkImport, commitImport, type CheckedRow, type ImportRow } from "@/lib/zahlen/actions";

type Target = Exclude<keyof ImportRow, "line">;
const TARGETS: { key: Target; label: string; required?: boolean; synonyms: string[] }[] = [
  { key: "link", label: "Link zum Video", synonyms: ["link", "url", "permalink", "video_link", "videolink", "beitragslink", "post link"] },
  { key: "title", label: "Titel", synonyms: ["titel", "title", "beschreibung", "description", "caption", "video"] },
  { key: "date", label: "Datum (Stand)", required: true, synonyms: ["datum", "date", "stand", "gemessen", "measured", "tag"] },
  { key: "views", label: "Aufrufe", required: true, synonyms: ["aufrufe", "views", "plays", "wiedergaben", "video views"] },
  { key: "reach", label: "Reichweite", synonyms: ["reichweite", "reach", "konten erreicht", "accounts reached"] },
  { key: "likes", label: "Likes", synonyms: ["likes", "gefällt mir", "gefaellt mir", "like"] },
  { key: "comments", label: "Kommentare", synonyms: ["kommentare", "comments", "kommentar"] },
  { key: "shares", label: "Geteilt", synonyms: ["geteilt", "shares", "teilen", "share"] },
  { key: "saves", label: "Gespeichert", synonyms: ["gespeichert", "saves", "saved", "speichern"] },
  { key: "watch", label: "Ø Wiedergabezeit (s)", synonyms: ["wiedergabezeit", "watch", "avg watch", "durchschnittliche wiedergabezeit", "average watch time", "wiedergabezeit_s"] },
];

const TEMPLATE =
  "video_link;titel;datum;aufrufe;reichweite;likes;kommentare;geteilt;gespeichert;wiedergabezeit_s\n" +
  "https://www.instagram.com/reel/DeuGwFgs_PK/;Also mein Nachbar hätte das anders gemacht;26.10.2026;18.400;14.300;209;24;61;38;8,5\n" +
  ";Gespräche für guten Mittagstisch opfern;26.10.2026;6.900;5.400;63;20;14;11;7\n";

const norm = (s: string) => s.toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();

function guess(headers: string[]): Partial<Record<Target, string>> {
  const out: Partial<Record<Target, string>> = {};
  const used = new Set<string>();
  for (const t of TARGETS) {
    const hit = headers.find((h) => !used.has(h) && t.synonyms.some((s) => norm(h) === s)) ?? headers.find((h) => !used.has(h) && t.synonyms.some((s) => norm(h).includes(s)));
    if (hit) {
      out[t.key] = hit;
      used.add(hit);
    }
  }
  return out;
}

export function ImportWizard() {
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<Target, string>>>({});
  const [checked, setChecked] = useState<CheckedRow[] | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const parsed = useMemo(() => {
    if (!raw.trim()) return null;
    const r = Papa.parse<Record<string, string>>(raw.trim(), { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
    return { headers: (r.meta.fields ?? []).filter(Boolean), rows: r.data, errors: r.errors.slice(0, 3) };
  }, [raw]);

  const load = (text: string, name: string | null) => {
    setRaw(text);
    setFileName(name);
    setChecked(null);
    const r = Papa.parse<Record<string, string>>(text.trim(), { header: true, preview: 1, transformHeader: (h) => h.trim() });
    setMapping(guess((r.meta.fields ?? []).filter(Boolean)));
  };

  const rows: ImportRow[] = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.map((r, i) => {
      const row: ImportRow = { line: i + 2 };
      for (const t of TARGETS) {
        const col = mapping[t.key];
        const v = col ? r[col] : undefined;
        if (v !== undefined && String(v).trim() !== "") row[t.key] = String(v).trim().slice(0, 480);
      }
      return row;
    });
  }, [parsed, mapping]);

  const missing = TARGETS.filter((t) => t.required && !mapping[t.key]).map((t) => t.label);
  const noIdentifier = !mapping.link && !mapping.title;
  const okCount = checked?.filter((c) => c.ok).length ?? 0;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader
          title="1. Datei wählen"
          sub="CSV mit einer Zeile je Video und Stichtag. Trennzeichen Semikolon oder Komma, Zahlen deutsch oder englisch geschrieben."
          action={
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent("﻿" + TEMPLATE)}`}
              download="scm-zahlen-vorlage.csv"
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-2 hover:bg-fill-2"
            >
              <Download className="size-4" /> Vorlage
            </a>
          }
        />
        <div className="grid gap-4 p-5 pt-2">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-card border border-dashed border-line-2 bg-fill-2 px-6 py-8 text-center hover:border-faint has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/30">
            <FileUp className="size-6 text-muted" aria-hidden />
            <span className="font-semibold">{fileName ?? "CSV-Datei auswählen"}</span>
            <span className="text-[13px] text-muted">{parsed ? `${parsed.rows.length} Zeilen, ${parsed.headers.length} Spalten erkannt` : "oder unten Text einfügen"}</span>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 2_000_000) {
                  toast.error("Die Datei ist größer als 2 MB.");
                  return;
                }
                load(await f.text(), f.name);
              }}
            />
          </label>
          <Field label="Oder Inhalt einfügen" optional>
            <Textarea
              value={raw}
              onChange={(e) => load(e.target.value, null)}
              rows={4}
              placeholder="video_link;titel;datum;aufrufe;…"
              className="font-mono text-[12px]"
              spellCheck={false}
            />
          </Field>
          {parsed?.errors.length ? (
            <p className="text-[13px] text-warn">Hinweis beim Lesen: {parsed.errors.map((e) => `Zeile ${(e.row ?? 0) + 2}: ${e.message}`).join("; ")}</p>
          ) : null}
        </div>
      </Card>

      {parsed && parsed.headers.length > 0 && (
        <Card>
          <CardHeader title="2. Spalten zuordnen" sub="Automatisch vorgeschlagen. Zur Zuordnung reicht der Link oder der Titel des Videos." />
          <div className="grid gap-4 p-5 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            {TARGETS.map((t) => (
              <Field key={t.key} label={t.label} optional={!t.required}>
                <Select
                  value={mapping[t.key] ?? ""}
                  onChange={(e) => {
                    setMapping((m) => ({ ...m, [t.key]: e.target.value || undefined }));
                    setChecked(null);
                  }}
                >
                  <option value="">nicht vorhanden</option>
                  {parsed.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 px-5 pb-5">
            {(missing.length > 0 || noIdentifier) && (
              <span className="text-[13px] text-warn">
                Noch zuordnen: {[...missing, ...(noIdentifier ? ["Link oder Titel"] : [])].join(", ")}
              </span>
            )}
            <Button
              type="button"
              disabled={pending || missing.length > 0 || noIdentifier || rows.length === 0}
              onClick={() =>
                start(async () => {
                  const r = await checkImport(rows);
                  if (r.ok) setChecked(r.rows);
                  else toast.error(r.error);
                })
              }
            >
              {pending && !checked ? "Prüft …" : "Prüfen"}
            </Button>
          </div>
        </Card>
      )}

      {checked && (
        <Card className="overflow-hidden">
          <CardHeader
            title="3. Vorschau"
            sub={`${okCount} von ${checked.length} Zeilen bereit. Gleicher Tag und gleiches Video überschreibt einen älteren CSV-Eintrag.`}
            action={
              <Button
                type="button"
                disabled={pending || okCount === 0}
                onClick={() =>
                  start(async () => {
                    const r = await commitImport(rows);
                    if (r.ok) {
                      toast.success(r.message);
                      if (r.redirectTo) router.push(r.redirectTo);
                    } else toast.error(r.error);
                  })
                }
              >
                {pending ? "Importiert …" : `${okCount} Zeilen importieren`}
              </Button>
            }
          />
          <ul className="max-h-[480px] divide-y divide-line overflow-y-auto">
            {checked.map((c) => (
              <li key={c.line} className={cn("flex items-start gap-3 px-5 py-3 text-[13px]", !c.ok && "bg-warn-soft/40")}>
                {c.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-ok" aria-label="bereit" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-label="Fehler" />}
                <span className="w-14 shrink-0 tabular-nums text-muted">Zeile {c.line}</span>
                <div className="min-w-0 flex-1">
                  {c.videoTitle ? (
                    <div className="truncate font-semibold">
                      {c.videoTitle} <span className="font-normal text-muted">· {c.clientName}</span>
                    </div>
                  ) : (
                    <div className="truncate text-muted">kein Video zugeordnet</div>
                  )}
                  {c.ok && c.values ? (
                    <div className="text-muted">
                      {c.measuredOn} · {num(c.values.views)} Aufrufe · {num(c.values.likes)} Likes
                      {c.matchedBy === "titel" && <Badge className="ml-2">über Titel</Badge>}
                    </div>
                  ) : (
                    <div className="text-warn">{c.errors.join(" · ")}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
