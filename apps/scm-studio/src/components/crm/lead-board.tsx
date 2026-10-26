"use client";
// Pipeline-Board der Anfragen: Spalten je Stufe, Karten per Drag & Drop (Desktop) oder Auswahlfeld
// (Handy, Tastatur) verschieben. Die Änderung erscheint sofort und wird im Hintergrund gespeichert.
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { setLeadStage } from "@/lib/crm/actions";
import { LEAD_STAGES } from "@/lib/labels";
import { LeadCard, type LeadCardData } from "./lead-card";

export function LeadBoard({ leads, today }: { leads: LeadCardData[]; today: string }) {
  const [pending, start] = useTransition();
  const [items, moveItem] = useOptimistic(leads, (state, m: { id: number; stage: string }) =>
    state.map((l) => (l.id === m.id ? { ...l, stage: m.stage } : l)),
  );
  const [over, setOver] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const move = (id: number, stage: string) => {
    const lead = items.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
    start(async () => {
      moveItem({ id, stage });
      const r = await setLeadStage(id, stage);
      if (r.ok) toast.success(r.message);
      else toast.error(r.error ?? "Konnte die Stufe nicht ändern");
    });
  };

  return (
    <div
      className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:snap-none"
      aria-busy={pending}
      role="list"
      aria-label="Anfragen nach Stufe"
    >
      {LEAD_STAGES.map((stage) => {
        const col = items.filter((l) => l.stage === stage.key);
        const closed = stage.key === "gewonnen" || stage.key === "verloren";
        return (
          <section
            key={stage.key}
            role="listitem"
            aria-label={`${stage.label}: ${col.length}`}
            onDragOver={(e) => {
              if (dragging === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOver(stage.key);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((o) => (o === stage.key ? null : o));
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = Number(e.dataTransfer.getData("text/x-lead-id"));
              setOver(null);
              setDragging(null);
              if (id) move(id, stage.key);
            }}
            className={cn(
              "flex w-[84vw] max-w-[300px] shrink-0 snap-start flex-col rounded-2xl bg-sunken transition-shadow sm:w-[264px]",
              over === stage.key && "ring-2 ring-accent/40",
              closed && "opacity-90",
            )}
          >
            <header className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
              <h2 className="text-[14px] font-semibold text-ink">{stage.label}</h2>
              <span className="text-[13px] tabular-nums text-muted">{col.length}</span>
            </header>
            <div className="grid min-h-24 content-start gap-2 px-2 pb-2">
              {col.map((l) => (
                <div
                  key={l.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/x-lead-id", String(l.id));
                    e.dataTransfer.effectAllowed = "move";
                    setDragging(l.id);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                  className={cn("cursor-grab active:cursor-grabbing", dragging === l.id && "opacity-50")}
                >
                  <LeadCard lead={l} today={today} onStage={(s) => move(l.id, s)} />
                </div>
              ))}
              {col.length === 0 && (
                <p className="rounded-xl border border-dashed border-line-2 px-3 py-5 text-center text-[13px] text-muted">
                  {dragging !== null ? "Hier ablegen" : "Keine Anfragen"}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
