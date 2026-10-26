"use client";
// Dialog "Neuer Termin": öffnet sich bei ?neu=1. Beim Schließen verschwinden auch die
// Vorbelegungs-Parameter (kunde, lead, art, von), Ansicht und Datum bleiben erhalten.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { Dialog } from "@/components/ui/dialog";
import type { ActionState } from "@/lib/action";
import type { CalendarOptions } from "@/lib/kalender/data";
import { EventForm, type EventDefaults } from "./event-form";

const PREFILL = ["neu", "kunde", "lead", "art", "von"];

function Inner(props: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; defaults: EventDefaults; options: CalendarOptions }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const open = sp.has("neu");
  const close = useCallback(() => {
    const next = new URLSearchParams(sp.toString());
    for (const k of PREFILL) next.delete(k);
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [sp, pathname, router]);
  return (
    <Dialog open={open} onClose={close} title="Neuer Termin" description="Drehs, Gespräche, Abgaben und interne Termine." size="lg">
      <EventForm key={sp.toString()} action={props.action} defaults={props.defaults} options={props.options} submitLabel="Termin anlegen" />
    </Dialog>
  );
}

export function NewEventDialog(props: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; defaults: EventDefaults; options: CalendarOptions }) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}
