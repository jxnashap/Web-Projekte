import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { RefreshWhile } from "@/components/skripte/refresh-while";
import { RichtungForm } from "@/components/skripte/richtung-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { integrations } from "@/lib/env";
import { dateTime } from "@/lib/format";
import { latestTrendRuns, runIsActive } from "@/lib/skripte/ideen";
import { getRichtung, SUGGESTION_DAYS } from "@/lib/skripte/trends";
import { saveRichtung, startTrendResearch } from "@/lib/skripte/trends-actions";

export const metadata: Metadata = { title: "Trend-Recherche · Ideen & Skripte" };
// „Jetzt recherchieren“ läuft als Server Action dieser Seite weiter (bis zu 5 Minuten)
export const maxDuration = 300;

export default function RecherchePage() {
  return (
    <>
      <PageHeader
        scene="Szene 05 · Ideen & Skripte"
        back={{ href: "/skripte", label: "Ideen & Skripte" }}
        title="Trend-Recherche"
        description="Jede Nacht sucht die KI nach aktuellen Trends auf TikTok und Instagram, die zu SCM passen, und legt daraus Video-Ideen unter Ideen ab. Jeder Trend ist mit Quelle belegt."
      />
      <Suspense fallback={<Skeleton className="h-[600px] rounded-[var(--radius-card)]" />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  await connection();
  const [user, richtung, runs] = await Promise.all([requireUser(), getRichtung(), latestTrendRuns(10)]);
  const admin = user.role === "admin";
  const live = integrations.openai();
  const running = runs.some(runIsActive);
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <RefreshWhile active={running} />
      <Card>
        <CardHeader title="Richtung" sub={admin ? "Gilt ab der nächsten Recherche" : "Ändern können Inhaber"} />
        <div className="px-5 pb-5">
          <RichtungForm action={saveRichtung} value={richtung} readOnly={!admin} />
        </div>
      </Card>

      <div className="grid content-start gap-6">
        <Card>
          <CardHeader title="So läuft es" />
          <div className="grid gap-3 px-5 pb-5 text-[14px] leading-relaxed text-ink-2">
            <p>
              TikTok und Instagram lassen sich nicht direkt durchsuchen: beide verlangen eine Anmeldung und bieten keine offene Suche an. Die Recherche nutzt deshalb die
              Websuche von OpenAI und findet, was öffentlich über aktuelle Trends steht, zum Beispiel im TikTok Creative Center, auf Fachportalen und in öffentlichen Beiträgen.
            </p>
            <p>Trends ohne gefundene Quelle fliegen raus. Vorschläge, die ihr {SUGGESTION_DAYS} Tage nicht anseht, räumen sich selbst weg.</p>
            <p className="text-muted">Kosten: je Lauf einige Websuchen plus Text, abgerechnet über euer OpenAI-Konto. Die Summe steht unter „KI diesen Monat“.</p>
            {live && admin && !running && (
              <div>
                <ActionButton action={startTrendResearch}>Jetzt recherchieren</ActionButton>
              </div>
            )}
            {!live && <p className="font-medium text-warn">Ruht, bis der OpenAI-Schlüssel eingetragen ist.</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Verlauf" sub={runs.length ? "Die letzten Läufe" : "Noch kein Lauf"} />
          <ul className="grid gap-4 px-5 pb-5">
            {runs.map((r) => (
              <li key={r.id} className="grid gap-2 border-t border-hairline pt-3 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-2 text-[14px]">
                  <span className="font-semibold">{dateTime(r.startedAt)}</span>
                  <span className="text-muted">{r.trigger === "nacht" ? "nachts" : "von Hand"}</span>
                  <span className="ml-auto">
                    {runIsActive(r) ? (
                      <Badge tone="info">Läuft</Badge>
                    ) : !r.finishedAt ? (
                      <Badge tone="neutral">Abgebrochen</Badge>
                    ) : r.ok ? (
                      <Badge tone="ok">{r.ideaCount === 1 ? "1 Vorschlag" : `${r.ideaCount} Vorschläge`}</Badge>
                    ) : (
                      <Badge tone="accent">Fehler</Badge>
                    )}
                  </span>
                </div>
                {r.error && <p className="text-[13px] text-muted">{r.error}</p>}
                {r.trends.map((t) => (
                  <div key={t.title} className="grid gap-0.5 text-[14px]">
                    <span className="font-medium text-ink">
                      {t.title} <span className="font-normal text-muted">· {t.platform}</span>
                    </span>
                    <span className="text-muted">{t.summary}</span>
                    {t.sources.map((s) => (
                      <a key={s.url} href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-8 items-center gap-1 text-[13px] text-accent-ink hover:underline">
                        <ExternalLink className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{s.title || s.url}</span>
                      </a>
                    ))}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
