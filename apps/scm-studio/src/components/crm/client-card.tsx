// Kunde in der Übersicht: Karte ab Tablet, kompakte Listenzeile auf dem Handy.
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import type { Client } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, ListRow } from "@/components/ui/card";
import type { Kontingent } from "@/lib/data/kontingent";
import { dateShort, eurShort, time } from "@/lib/format";
import { BRANCHEN, CLIENT_STATUS, EVENT_KINDS } from "@/lib/labels";
import { ClientAvatar } from "./client-avatar";
import { ContactIcons } from "./contact-links";
import { KontingentMini, KontingentTiny } from "./kontingent-mini";

type NextEvent = { startsAt: Date; title: string; kind: string } | null;

const eventText = (e: NonNullable<NextEvent>) => `${EVENT_KINDS[e.kind]?.label ?? "Termin"} ${dateShort(e.startsAt)}, ${time(e.startsAt)}`;

export function ClientCard({
  client: c,
  kontingent,
  nextEvent,
  month,
}: {
  client: Client;
  month: string;
  kontingent: Kontingent | null;
  nextEvent: NextEvent;
}) {
  const st = CLIENT_STATUS[c.status];
  return (
    <Card className="relative flex flex-col transition-shadow has-[a[data-card]:focus-visible]:ring-2 has-[a[data-card]:focus-visible]:ring-accent has-[a[data-card]:focus-visible]:ring-offset-2 has-[a[data-card]:hover]:shadow-[var(--shadow-raised)]">
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ClientAvatar client={c} size={40} />
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold">
                <Link href={`/kunden/${c.id}`} data-card className="block truncate outline-none after:absolute after:inset-0 after:rounded-[inherit]">
                  {c.name}
                </Link>
              </h2>
              <p className="truncate text-[13px] text-muted">{[BRANCHEN[c.branche] ?? c.branche, c.ort ?? c.city].filter(Boolean).join(" · ")}</p>
            </div>
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
                <span className="truncate">{eventText(nextEvent)}</span>
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

/** Kompakte Zeile für die Handy-Liste: Name, Paket, Kontingent, nächster Termin. Die ganze Zeile führt zum Kunden. */
export function ClientRow({ client: c, kontingent, nextEvent }: { client: Client; kontingent: Kontingent | null; nextEvent: NextEvent }) {
  const st = CLIENT_STATUS[c.status];
  const paket = c.packageVideos ? `${c.packageVideos} Videos` : c.status === "test" ? "Testvideos" : "Kein Paket";
  return (
    <ListRow href={`/kunden/${c.id}`} className="py-3">
      <ClientAvatar client={c} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[16px] font-semibold">{c.name}</span>
          {st && c.status !== "aktiv" && <Badge tone={st.tone}>{st.label}</Badge>}
        </div>
        <div className="truncate text-[13px] text-muted">{[paket, c.ort ?? c.city].filter(Boolean).join(" · ")}</div>
        {nextEvent && (
          <div className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-ink-2">
            <CalendarDays className="size-3.5 shrink-0 text-muted" aria-hidden />
            <span className="truncate">{eventText(nextEvent)}</span>
          </div>
        )}
      </div>
      {kontingent && <KontingentTiny k={kontingent} />}
    </ListRow>
  );
}
