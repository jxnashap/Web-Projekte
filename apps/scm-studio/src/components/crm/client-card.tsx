// Karte eines Kunden in der Übersicht.
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import type { Client } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Kontingent } from "@/lib/data/kontingent";
import { dateShort, eurShort, time } from "@/lib/format";
import { BRANCHEN, CLIENT_STATUS, EVENT_KINDS } from "@/lib/labels";
import { ContactIcons } from "./contact-links";
import { KontingentMini } from "./kontingent-mini";

export function ClientCard({
  client: c,
  kontingent,
  nextEvent,
  month,
}: {
  client: Client;
  month: string;
  kontingent: Kontingent | null;
  nextEvent: { startsAt: Date; title: string; kind: string } | null;
}) {
  const st = CLIENT_STATUS[c.status];
  return (
    <Card className="relative flex flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[17px] font-semibold">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
              <Link href={`/kunden/${c.id}`} className="truncate after:absolute after:inset-0 focus-visible:outline-none">
                {c.name}
              </Link>
            </h2>
            <p className="truncate pl-4.5 text-[13px] text-muted">{[BRANCHEN[c.branche] ?? c.branche, c.ort ?? c.city].filter(Boolean).join(" · ")}</p>
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

        {kontingent && <KontingentMini k={kontingent} month={month} />}

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
    </Card>
  );
}
