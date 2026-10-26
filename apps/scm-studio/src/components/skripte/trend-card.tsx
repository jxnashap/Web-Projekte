// Seitenleiste unter Ideen: Stand der nächtlichen Trend-Recherche, die neuesten Trends mit Quelle, Start von Hand.
import { ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { requireUser } from "@/lib/auth";
import { integrations } from "@/lib/env";
import { dateTime } from "@/lib/format";
import { latestTrendRuns, runIsActive } from "@/lib/skripte/ideen";
import { startTrendResearch } from "@/lib/skripte/trends-actions";
import { RefreshWhile } from "./refresh-while";

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export async function TrendCard() {
  await connection();
  const [user, runs] = await Promise.all([requireUser(), latestTrendRuns(5)]);
  const live = integrations.openai();
  const last = runs[0];
  const running = Boolean(last && runIsActive(last));
  const lastOk = runs.find((r) => r.ok && r.trends.length > 0);
  return (
    <Card>
      <RefreshWhile active={running} />
      <CardHeader
        title="Trend-Recherche"
        sub="Jede Nacht auf TikTok und Instagram"
        action={running ? <Badge tone="info">Läuft</Badge> : live ? <Badge tone="ok">Aktiv</Badge> : <Badge tone="warn">Ruht</Badge>}
      />
      <div className="grid gap-4 px-5 pb-5 text-[14px]">
        {!live ? (
          <p className="text-muted">
            Die Recherche nutzt die Websuche von OpenAI. Sobald der OpenAI-Schlüssel eingetragen ist, läuft sie jede Nacht und legt Vorschläge unter Ideen ab.
          </p>
        ) : running ? (
          <p className="text-muted">Sucht gerade nach Trends. Das dauert ein paar Minuten, die Seite aktualisiert sich selbst.</p>
        ) : last ? (
          <p className="text-muted">
            Zuletzt {dateTime(last.finishedAt ?? last.startedAt)}:{" "}
            {last.ok ? (
              <span className="text-ink">
                {last.trends.length === 1 ? "1 Trend" : `${last.trends.length} Trends`}, {last.ideaCount === 1 ? "1 Vorschlag" : `${last.ideaCount} Vorschläge`}
              </span>
            ) : (
              <span className="text-accent-ink">{last.error ?? "fehlgeschlagen"}</span>
            )}
          </p>
        ) : (
          <p className="text-muted">Die erste Recherche läuft heute Nacht.</p>
        )}

        {lastOk && (
          <ul className="grid gap-3">
            {lastOk.trends.slice(0, 4).map((t) => (
              <li key={t.title} className="grid gap-0.5">
                <span className="font-semibold text-ink">
                  {t.title} <span className="font-normal text-muted">· {t.platform}</span>
                </span>
                <span className="line-clamp-2 text-muted">{t.summary}</span>
                {t.sources[0] && (
                  <a href={t.sources[0].url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-8 items-center gap-1 text-[13px] text-accent-ink hover:underline">
                    <ExternalLink className="size-3.5" aria-hidden /> {host(t.sources[0].url)}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {live && user.role === "admin" && !running && (
            <ActionButton action={startTrendResearch}>
              <Sparkles className="size-4" aria-hidden /> Jetzt recherchieren
            </ActionButton>
          )}
          <Link href="/skripte/recherche" className="inline-flex min-h-8 items-center text-[14px] font-semibold text-accent-ink hover:underline">
            Richtung und Verlauf
          </Link>
        </div>
      </div>
    </Card>
  );
}
