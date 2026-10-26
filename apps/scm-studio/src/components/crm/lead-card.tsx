// Karte einer Anfrage (Board und Handy-Liste).
import { ArrowRight, CalendarClock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { packageShort, START_WISH } from "@/lib/crm/labels";
import { dateShort } from "@/lib/format";
import { LEAD_SCORE, LEAD_STAGES } from "@/lib/labels";
import { ContactIcons } from "./contact-links";

export type LeadCardData = {
  id: number;
  company: string;
  name: string;
  ort: string | null;
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
        {at && (
          <span className="whitespace-nowrap">
            {" · "}
            {due === "overdue" ? `überfällig seit ${dateShort(at)}` : due === "today" ? "heute" : dateShort(at)}
          </span>
        )}
      </span>
    </div>
  );
}

export function LeadCard({ lead: l, today, onStage }: { lead: LeadCardData; today: string; onStage?: (stage: string) => void }) {
  const score = l.score ? LEAD_SCORE[l.score] : null;
  const interest = [packageShort(l.packageInterest), l.startWish ? START_WISH[l.startWish] : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <article className="group relative rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-pop)]">
      <div className="flex items-start gap-2">
        {score && (
          <Badge tone={score.tone} className="mt-0.5 h-5 px-2 text-[11px]">
            <span className="sr-only">Bewertung </span>
            {score.label}
          </Badge>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold leading-snug">
            <Link href={`/anfragen/${l.id}`} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none" draggable={false}>
              {l.company}
            </Link>
          </h3>
          <p className="truncate text-[12.5px] text-muted">{[l.name !== l.company ? l.name : null, l.ort].filter(Boolean).join(" · ") || " "}</p>
        </div>
      </div>

      {l.stage === "verloren" && l.lostReason ? (
        <p className="mt-2 line-clamp-2 text-[13px] text-muted">Grund: {l.lostReason}</p>
      ) : l.stage === "gewonnen" && l.clientName ? (
        <p className="mt-2 flex items-center gap-1 text-[13px] font-semibold text-ok">
          <ArrowRight className="size-3.5" /> Kunde: {l.clientName}
        </p>
      ) : (
        <>
          <NextStep step={l.nextStep} at={l.nextStepAt} today={today} className="mt-2" />
          {score && l.score === "A" && !l.nextStep && <p className="mt-2 text-[13px] font-semibold text-accent-ink">{score.hint}</p>}
        </>
      )}

      {(interest || l.phone || l.email || onStage) && (
        <div className="relative z-10 mt-3 flex items-center justify-between gap-2">
          <ContactIcons phone={l.phone} email={l.email} name={l.name} preferred={l.contactWay} />
          {onStage ? (
            <label className="ml-auto">
              <span className="sr-only">Stufe von {l.company} ändern</span>
              <select
                value={l.stage}
                onChange={(e) => onStage(e.target.value)}
                className="h-9 max-w-[132px] cursor-pointer rounded-full border border-line-2 bg-surface pl-3 pr-2 text-[12.5px] font-semibold text-ink-2 hover:border-ink focus:border-ink focus:outline-none"
              >
                {LEAD_STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            interest && <span className="truncate text-[12px] text-muted">{interest}</span>
          )}
        </div>
      )}
      {onStage && interest && <p className="mt-2 truncate text-[12px] text-muted">{interest}</p>}
    </article>
  );
}
