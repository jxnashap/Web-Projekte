// Karte eines Kunden in der Übersicht.
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import type { Client } from "@/db/schema";
import { KontingentBar } from "@/components/kontingent-bar";
import { Badge } from "@/components/ui/badge";
import type { Kontingent } from "@/lib/data/kontingent";
import { dateShort, eurShort, time } from "@/lib/format";
import { BRANCHEN, CLIENT_STATUS, EVENT_KINDS } from "@/lib/labels";
import { ContactIcons } from "./contact-links";

export function ClientCard({
  client: c,
  kontingent,
  nextEvent,
}: {
  client: Client;
  kontingent: Kontingent | null;
  nextEvent: { startsAt: Date; title: string; kind: string } | null;
}) {
  const st = CLIENT_STATUS[c.status];
  return (
    <article className="relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-pop)]">
      <div className="h-1.5" style={{ background: c.color }} aria-hidden />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-semibold">
              <Link href={`/kunden/${c.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                {c.name}
              </Link>
            </h2>
            <p className="truncate text-[13px] text-muted">{[BRANCHEN[c.branche] ?? c.branche, c.ort ?? c.city].filter(Boolean).join(" · ")}</p>
          </div>
          {st && <Badge tone={st.tone}>{st.label}</Badge>}
        </div>

        <div className="text-[14px]">
          {c.packageVideos ? (
            <p className="font-semibold">
              {c.packageVideos} Videos im Monat
              {c.packagePriceCents != null && <span className="font-normal text-muted"> · {eurShort(c.packagePriceCents)} netto</span>}
            </p>
          ) : (
            <p className="text-muted">{c.status === "test" ? "Testvideos, noch kein Paket" : "Kein Paket hinterlegt"}</p>
          )}
        </div>

        {kontingent && <KontingentBar k={kontingent} compact />}

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
          <div className="min-w-0 text-[13px]">
            {nextEvent ? (
              <p className="flex items-center gap-1.5 truncate text-ink-2">
                <CalendarDays className="size-3.5 shrink-0 text-muted" aria-hidden />
                <span className="truncate">
                  {EVENT_KINDS[nextEvent.kind]?.label ?? "Termin"} {dateShort(nextEvent.startsAt)}, {time(nextEvent.startsAt)}
                </span>
              </p>
            ) : (
              <p className="text-muted">Kein Termin geplant</p>
            )}
            {c.contactName && <p className="truncate text-muted">{c.contactName}</p>}
          </div>
          <ContactIcons phone={c.phone} email={c.email} name={c.contactName ?? c.name} className="relative z-10" />
        </div>
      </div>
    </article>
  );
}
