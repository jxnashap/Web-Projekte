// Karte einer Anfrage (Board und Handy-Liste). Die ganze Karte führt zur Anfrage; Kontakt und Stufe bleiben bedienbar.
import { CalendarClock, UserCheck } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { packageShort, START_WISH } from "@/lib/crm/labels";
import { dateShort } from "@/lib/format";
import { LEAD_SCORE } from "@/lib/labels";
import { ContactIcons } from "./contact-links";

export type LeadCardData = {
  id: number;
  company: string;
  name: string;
  ort: string | null;
  branche: string | null;
  score: string | null;
  stage: string;
  nextStep: string | null;
  nextStepAt: string | null;
  phone: string | null;
  email: string | null;
  contactWay: string | null;
  packageInterest: string | null;
  startWish: string | null;
  source: string;
  clientId: number | null;
  clientName: string | null;
  lostReason: string | null;
};

const nb = (s: string) => s.replace(/ /g, "\u00a0");

/** Fälligkeit des nächsten Schritts: überfällig, heute oder später */
export function dueState(at: string | null, today: string): "overdue" | "today" | "later" | null {
  if (!at) return null;
  return at < today ? "overdue" : at === today ? "today" : "later";
}

export function NextStep({ step, at, today, className }: { step: string | null; at: string | null; today: string; className?: string }) {
  if (!step && !at) return null;
  const due = dueState(at, today);
  return (
    <div
      className={cn(
        "flex items-start gap-1.5 text-[13px]",
        due === "overdue" ? "font-semibold text-accent-ink" : due === "today" ? "font-semibold text-ink" : "text-ink-2",
        className,
      )}
    >
      <CalendarClock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0">
        {step ?? "Nächster Schritt"}
        {at && (due !== "today" || !/heute/i.test(step ?? "")) && (
          <>
            {" · "}
            {/* Datum nicht umbrechen ("25. Okt."), sonst darf die Zeile umbrechen */}
            {due === "overdue" ? `überfällig seit ${nb(dateShort(at))}` : due === "today" ? "heute" : nb(dateShort(at))}
          </>
        )}
      </span>
    </div>
  );
}

export function LeadCard({ lead: l, today, stageControl }: { lead: LeadCardData; today: string; stageControl?: React.ReactNode }) {
  const score = l.score ? LEAD_SCORE[l.score] : null;
  const interest = [packageShort(l.packageInterest), l.startWish ? START_WISH[l.startWish] : null].filter(Boolean).join(" · ");
  const who = [l.name !== l.company ? l.name : null, l.ort].filter(Boolean).join(" · ");
  return (
    <Card className="relative p-3.5 transition-shadow has-[a[data-card]:focus-visible]:ring-2 has-[a[data-card]:focus-visible]:ring-accent has-[a[data-card]:focus-visible]:ring-offset-2 has-[a[data-card]:hover]:shadow-[var(--shadow-raised)]">
      <div className="flex items-start gap-2">
        {score && (
          <Badge tone={score.tone} className="mt-0.5">
            <span className="sr-only">Bewertung </span>
            {score.label}
          </Badge>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold leading-snug">
            <Link href={`/anfragen/${l.id}`} data-card className="outline-none after:absolute after:inset-0 after:rounded-[inherit]" draggable={false}>
              {l.company}
            </Link>
          </h3>
          {who && <p className="truncate text-[13px] text-muted">{who}</p>}
        </div>
      </div>

      {l.stage === "verloren" ? (
        <p className="mt-2 line-clamp-2 text-[13px] text-muted">{l.lostReason ? `Grund: ${l.lostReason}` : "Ohne Grund als verloren markiert"}</p>
      ) : l.clientId ? (
        <p className="mt-2 text-[13px]">
          <Link href={`/kunden/${l.clientId}`} className="relative z-10 inline-flex items-center gap-1 font-semibold text-ok hover:underline">
            <UserCheck className="size-3.5" aria-hidden /> Kunde: {l.clientName ?? "ansehen"}
          </Link>
        </p>
      ) : (
        <>
          <NextStep step={l.nextStep} at={l.nextStepAt} today={today} className="mt-2" />
          {score && l.score === "A" && !l.nextStep && <p className="mt-2 text-[13px] font-semibold text-accent-ink">{score.hint}</p>}
        </>
      )}

      {interest && <p className="mt-2 truncate text-[12px] text-muted">{interest}</p>}

      {(l.phone || l.email) && !l.clientId && l.stage !== "verloren" && (
        <ContactIcons phone={l.phone} email={l.email} name={l.name} preferred={l.contactWay} className="relative z-10 mt-3" />
      )}
      {stageControl && <div className="relative z-10 mt-3">{stageControl}</div>}
    </Card>
  );
}
