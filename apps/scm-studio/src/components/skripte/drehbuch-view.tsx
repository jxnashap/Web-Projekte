// Drehbuch-Ansicht: Schreibmaschinen-Look wie auf der Website (Courier Prime), zum Lesen am Set.
import type { Script } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { dateDe } from "@/lib/format";

export function DrehbuchView({ script, clientName }: { script: Script; clientName: string | null }) {
  const beats = script.beats;
  const last = beats[beats.length - 1]?.tc;
  return (
    <Card className="mx-auto w-full max-w-3xl px-5 py-8 font-script sm:px-12 sm:py-12">
      <header className="border-b border-line pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
          <span>SCM Creatives · Drehbuch</span>
          <span>Stand {dateDe(script.updatedAt)}</span>
        </div>
        <h2 className="mt-5 text-[22px] font-bold leading-tight text-ink sm:text-[26px]">{script.title}</h2>
        <dl className="mt-4 grid gap-1 text-[13px] text-ink-2 sm:grid-cols-2">
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
            <dd className="inline">{last ? `ca. ${last} plus Aufruf` : "offen"}</dd>
          </div>
          <div>
            <dt className="inline text-muted">Status: </dt>
            <dd className="inline">{script.status === "final" ? "Final" : "Entwurf"}</dd>
          </div>
        </dl>
      </header>

      {script.hook && (
        <section className="mt-8 border-l-2 border-accent pl-4">
          <div className="text-[12px] font-bold text-accent-ink">Hook</div>
          <p className="mt-1 text-[17px] leading-relaxed text-ink">{script.hook}</p>
        </section>
      )}

      <ol className="mt-8 grid gap-7">
        {beats.map((b, i) => (
          <li key={i}>
            <div className="flex items-baseline justify-between gap-3 text-[12px] font-bold">
              <span className="text-ink">
                Szene {String(i + 1).padStart(2, "0")} · {b.label || "Ohne Abschnitt"}
              </span>
              <span className="text-accent-ink">{b.tc}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink">{b.text || "…"}</p>
            {b.shot && <p className="mt-1 text-[13px] text-muted">(Einstellung: {b.shot})</p>}
          </li>
        ))}
        {beats.length === 0 && <li className="text-[14px] text-muted">Noch kein Ablauf. Im Reiter Bearbeiten Beats hinzufügen.</li>}
      </ol>

      {(script.cta || script.caption) && (
        <footer className="mt-10 grid gap-5 border-t border-line pt-6 text-[14px] leading-relaxed">
          {script.cta && (
            <div>
              <div className="text-[12px] font-bold text-muted">Aufruf</div>
              <p className="mt-1 text-ink">{script.cta}</p>
            </div>
          )}
          {script.caption && (
            <div>
              <div className="text-[12px] font-bold text-muted">Caption</div>
              <p className="mt-1 whitespace-pre-line text-ink-2">{script.caption}</p>
            </div>
          )}
        </footer>
      )}
    </Card>
  );
}
