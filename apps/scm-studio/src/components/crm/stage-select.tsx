"use client";
// Stufe einer Anfrage direkt ändern (Liste, Handy-Karten, Detailseite). Offene Stufen speichern sofort,
// "Gewonnen" öffnet "Zum Kunden machen", "Verloren" fragt nach dem Grund. Umgewandelte Anfragen zeigen den Kunden.
import { UserCheck } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { setLeadStage } from "@/lib/crm/actions";
import { LEAD_STAGES } from "@/lib/labels";
import { type LeadRef, useLeadDialogs } from "./lead-dialogs";

/** Reines Auswahlfeld (auch für das Board, das Karten selbst verschiebt). */
export function StageField({
  value,
  onChange,
  label,
  disabled,
  className,
}: {
  value: string;
  onChange: (stage: string) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      aria-busy={disabled}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className={cn("cursor-pointer whitespace-nowrap disabled:opacity-60", className)}
    >
      {LEAD_STAGES.map((s) => (
        <option key={s.key} value={s.key}>
          {/* Auslassungspunkte: danach folgt noch ein Schritt (Dialog) */}
          {s.key === "gewonnen" && value !== "gewonnen" ? "Gewonnen …" : s.key === "verloren" && value !== "verloren" ? "Verloren …" : s.label}
        </option>
      ))}
    </Select>
  );
}

export function StageSelect({
  lead,
  clientId,
  label,
  className,
}: {
  lead: LeadRef;
  clientId?: number | null;
  label: string;
  className?: string;
}) {
  const dialogs = useLeadDialogs();
  const [stage, setStage] = useOptimistic(lead.stage);
  const [pending, start] = useTransition();

  if (clientId)
    return (
      <Link
        href={`/kunden/${clientId}`}
        className={cn("inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap text-[14px] font-semibold text-ok hover:underline sm:min-h-0", className)}
      >
        <UserCheck className="size-4" aria-hidden /> Zum Kunden
      </Link>
    );

  return (
    <StageField
      value={stage}
      label={label}
      disabled={pending}
      className={className}
      onChange={(next) => {
        if (next === stage) return;
        if (next === "gewonnen") return dialogs.convert(lead);
        if (next === "verloren") return dialogs.lost(lead);
        start(async () => {
          setStage(next);
          const r = await setLeadStage(lead.id, next);
          if (r.ok) toast.success(r.message);
          else toast.error(r.error ?? "Konnte die Stufe nicht ändern");
        });
      }}
    />
  );
}
