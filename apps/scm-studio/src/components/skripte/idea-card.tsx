import { CalendarCheck, Check, Link2, ScrollText, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { Badge, Dot } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/confirm-action";
import { BRANCHEN } from "@/lib/labels";
import { monthLabel } from "@/lib/format";
import type { IdeaRow } from "@/lib/skripte/ideen";
import { setIdeaStatus } from "@/lib/skripte/ideen-actions";

/** Karte einer Video-Idee. Vorschläge aus der Recherche tragen Trend und Quellen und lassen sich übernehmen oder verwerfen. */
export function IdeaCard({ row }: { row: IdeaRow }) {
  const { i, clientName, clientColor, videoMonth, scripts } = row;
  const suggestion = i.status === "vorschlag";
  return (
    <article className="squircle relative flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-raised)]">
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
        {clientName ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <Dot color={clientColor ?? "var(--color-line-2)"} />
            <span className="truncate">{clientName}</span>
          </span>
        ) : (
          <span>{i.branche ? (BRANCHEN[i.branche] ?? i.branche) : "Für alle Kunden"}</span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {i.source === "recherche" && (
            <Badge tone="info">
              <Sparkles className="size-3" aria-hidden /> Recherche
            </Badge>
          )}
          {i.status === "verworfen" && <Badge tone="neutral">Verworfen</Badge>}
        </span>
      </div>
      <h3 className="mt-2 text-[17px] font-semibold leading-snug tracking-[-0.02em] text-ink">
        <Link href={`/skripte/ideen/${i.id}`} className="after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-[''] hover:underline">
          {i.title}
        </Link>
      </h3>
      {i.hook && <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-ink-2">„{i.hook}“</p>}
      {i.trend && (
        <p className="mt-2 line-clamp-2 text-[13px] text-muted">
          Trend: <span className="font-medium text-ink-2">{i.trend}</span>
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-[13px] text-muted">
        {i.format && <span>{i.format}</span>}
        {i.sources.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <Link2 className="size-3.5" aria-hidden /> {i.sources.length === 1 ? "1 Quelle" : `${i.sources.length} Quellen`}
          </span>
        )}
        {scripts.length > 0 && (
          <span className="inline-flex items-center gap-1 text-info">
            <ScrollText className="size-3.5" aria-hidden /> {scripts.length === 1 ? "Skript" : `${scripts.length} Skripte`}
          </span>
        )}
        {videoMonth && (
          <span className="inline-flex items-center gap-1 text-ok">
            <CalendarCheck className="size-3.5" aria-hidden /> <span className="capitalize">{monthLabel(videoMonth)}</span>
          </span>
        )}
      </div>
      {/* Knöpfe liegen über der Fläche des Links */}
      <div className="relative mt-3 flex flex-wrap gap-2 border-t border-hairline pt-3">
        {suggestion ? (
          <>
            <ActionButton action={setIdeaStatus.bind(null, i.id, "offen")} variant="secondary">
              <Check className="size-4" aria-hidden /> Übernehmen
            </ActionButton>
            <ActionButton action={setIdeaStatus.bind(null, i.id, "verworfen")} variant="ghost">
              <X className="size-4" aria-hidden /> Verwerfen
            </ActionButton>
          </>
        ) : i.status === "verworfen" ? (
          <ActionButton action={setIdeaStatus.bind(null, i.id, "offen")} variant="secondary">
            Zurückholen
          </ActionButton>
        ) : scripts.length > 0 ? (
          <LinkButton href={`/skripte/${scripts[0].id}`} variant="secondary" size="sm">
            <ScrollText className="size-4" aria-hidden /> Zum Skript
          </LinkButton>
        ) : (
          <LinkButton href={`/skripte/neu?idee=${i.id}`} variant="secondary" size="sm">
            <Sparkles className="size-4" aria-hidden /> Skript schreiben
          </LinkButton>
        )}
      </div>
    </article>
  );
}
