// Drehbuch-Ansicht: Schreibmaschinen-Look wie auf der Website (Courier Prime), zum Lesen am Set.
// Hook und Aufruf stehen als Abschnitte im Ablauf (nicht doppelt als eigene Blöcke).
import Link from "next/link";
import type { Script } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { dateDe } from "@/lib/format";
import { lengthLabel, mergeHookAndCta, scriptStatusLabel } from "@/lib/skripte/schema";

export function DrehbuchView({ script, clientName }: { script: Script; clientName: string | null }) {
  const beats = mergeHookAndCta(script.beats, script.hook, script.cta);
  return (
    <Card className="mx-auto w-full max-w-3xl px-5 py-8 font-script sm:px-12 sm:py-12">
      <header className="border-b border-hairline pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
          <span>SCM Creatives · Drehbuch</span>
          <span>Stand {dateDe(script.updatedAt)}</span>
        </div>
        <h2 className="mt-5 text-[22px] font-bold leading-tight text-ink sm:text-[26px]">{script.title}</h2>
        <dl className="mt-4 grid gap-1 text-[14px] text-ink-2 sm:grid-cols-2">
          <div>
            <dt className="inline text-muted">Kunde: </dt>
            <dd className="inline">{clientName ?? "offen"}</dd>
          </div>
          <div>
            <dt className="inline text-muted">Format: </dt>
            <dd className="inline">{script.format ?? "offen"}</dd>
          </div>
          <div>
            <dt className="inline text-muted">Länge: </dt>
            <dd className="inline">{lengthLabel(beats) ?? "offen"}</dd>
          </div>
          <div>
            <dt className="inline text-muted">Status: </dt>
            <dd className="inline">{scriptStatusLabel(script.status)}</dd>
          </div>
        </dl>
      </header>

      <ol className="mt-8 grid gap-7">
        {beats.map((b, i) => (
          <li key={i}>
            <div className="flex items-baseline justify-between gap-3 text-[13px] font-bold">
              <span className="text-ink">
                Szene {String(i + 1).padStart(2, "0")} · {b.label || "Ohne Abschnitt"}
              </span>
              <span className="text-accent-ink tabular-nums">{b.tc}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed text-ink">{b.text || "…"}</p>
            {b.action && <p className="mt-1 text-[15px] text-ink-2">({b.action})</p>}
            {b.shot && <p className="mt-1 text-[14px] text-muted">(Kamera: {b.shot})</p>}
            {b.overlay && <p className="mt-1 text-[14px] text-muted">(Text im Bild: {b.overlay})</p>}
            {b.sound && <p className="mt-1 text-[14px] text-muted">(Ton: {b.sound})</p>}
            {b.cut && <p className="mt-1 text-[14px] text-muted">(Schnitt: {b.cut})</p>}
          </li>
        ))}
        {beats.length === 0 && (
          <li className="text-[15px] text-muted">
            Noch kein Ablauf.{" "}
            <Link href={`/skripte/${script.id}`} className="font-semibold text-accent-ink hover:underline">
              Schritte hinzufügen
            </Link>
          </li>
        )}
      </ol>

      {script.caption && (
        <footer className="mt-10 border-t border-hairline pt-6 text-[15px] leading-relaxed">
          <div className="text-[13px] font-bold text-muted">Caption</div>
          <p className="mt-1 whitespace-pre-line text-ink-2">{script.caption}</p>
        </footer>
      )}
    </Card>
  );
}
