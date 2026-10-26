"use client";
// Pipeline der Anfragen in Spalten: die fünf offenen Stufen nebeneinander, abgeschlossene darunter eingeklappt.
// Karten per Drag & Drop (Desktop) oder Auswahlfeld (Handy, Tastatur) verschieben. Offene Stufen speichern sofort;
// Gewonnen öffnet "Zum Kunden machen", Verloren fragt nach dem Grund (beim Ziehen erscheinen dafür Ablageflächen).
import { ChevronDown, UserCheck, UserX } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { setLeadStage } from "@/lib/crm/actions";
import { LEAD_STAGES } from "@/lib/labels";
import { LeadCard, type LeadCardData } from "./lead-card";
import { useLeadDialogs } from "./lead-dialogs";
import { StageField } from "./stage-select";

const OPEN = LEAD_STAGES.filter((s) => s.key !== "gewonnen" && s.key !== "verloren");

export function LeadBoard({ leads, today }: { leads: LeadCardData[]; today: string }) {
  const dialogs = useLeadDialogs();
  const [pending, start] = useTransition();
  const [items, moveItem] = useOptimistic(leads, (state, m: { id: number; stage: string }) =>
    state.map((l) => (l.id === m.id ? { ...l, stage: m.stage } : l)),
  );
  const [over, setOver] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const move = (id: number, stage: string) => {
    const lead = items.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
    if (stage === "gewonnen") return dialogs.convert(lead);
    if (stage === "verloren") return dialogs.lost(lead);
    start(async () => {
      moveItem({ id, stage });
      const r = await setLeadStage(id, stage);
      if (r.ok) toast.success(r.message);
      else toast.error(r.error ?? "Konnte die Stufe nicht ändern");
    });
  };

  // Ablagefläche (Spalte oder Abschluss-Feld)
  const drop = (key: string) => ({
    onDragOver: (e: React.DragEvent) => {
      // am Datentyp erkennen (nicht am Zustand), damit auch schnelle Bewegungen ankommen
      if (!e.dataTransfer.types.includes("text/x-lead-id")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setOver(key);
    },
    onDragLeave: (e: React.DragEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((o) => (o === key ? null : o));
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const id = Number(e.dataTransfer.getData("text/x-lead-id"));
      setOver(null);
      setDragging(null);
      if (id) move(id, key);
    },
  });

  const card = (l: LeadCardData) => (
    <div
      key={l.id}
      draggable={!l.clientId}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/x-lead-id", String(l.id));
        e.dataTransfer.effectAllowed = "move";
        setDragging(l.id);
      }}
      onDragEnd={() => {
        setDragging(null);
        setOver(null);
      }}
      className={cn(!l.clientId && "cursor-grab active:cursor-grabbing", dragging === l.id && "opacity-50")}
    >
      <LeadCard
        lead={l}
        today={today}
        stageControl={l.clientId ? undefined : <StageField value={l.stage} label={`Stufe von ${l.company} ändern`} onChange={(s) => move(l.id, s)} />}
      />
    </div>
  );

  const won = items.filter((l) => l.stage === "gewonnen");
  const lost = items.filter((l) => l.stage === "verloren");

  return (
    <div className="grid gap-5" aria-busy={pending}>
      <div
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:snap-none"
        role="list"
        aria-label="Offene Anfragen nach Stufe"
      >
        {OPEN.map((stage) => {
          const col = items.filter((l) => l.stage === stage.key);
          return (
            <section
              key={stage.key}
              role="listitem"
              aria-label={`${stage.label}: ${col.length}`}
              {...drop(stage.key)}
              className={cn(
                "flex w-[84vw] max-w-[300px] shrink-0 snap-start flex-col rounded-2xl bg-sunken transition-shadow sm:w-[264px] lg:w-auto lg:min-w-[200px] lg:max-w-none lg:flex-1 lg:shrink",
                over === stage.key && "bg-accent-soft/60 ring-2 ring-accent/40",
              )}
            >
              <header className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
                <h2 className="truncate text-[14px] font-semibold text-ink">{stage.label}</h2>
                <span className="text-[13px] tabular-nums text-muted">{col.length}</span>
              </header>
              <div className="grid min-h-24 content-start gap-2 px-2 pb-2">
                {col.map(card)}
                {col.length === 0 && (
                  <p className="rounded-xl bg-surface/60 px-3 py-5 text-center text-[13px] text-muted">{dragging !== null ? "Hier ablegen" : "Noch keine"}</p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Abgeschlossene Anfragen: eingeklappt, damit die offene Arbeit auf einen Blick zu sehen ist */}
      {won.length + lost.length > 0 && (
        <section aria-label="Abgeschlossene Anfragen">
          <button
            type="button"
            aria-expanded={showClosed}
            aria-controls="anfragen-abgeschlossen"
            onClick={() => setShowClosed((s) => !s)}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] px-1 text-[15px] font-semibold text-ink hover:text-ink-2"
          >
            <ChevronDown className={cn("size-4 text-muted transition-transform", !showClosed && "-rotate-90")} aria-hidden />
            Abgeschlossen
            <span className="font-normal text-muted">
              {won.length} gewonnen · {lost.length} verloren
            </span>
          </button>
          {showClosed && (
            <div id="anfragen-abgeschlossen" className="mt-3 grid gap-5">
              {[
                { key: "gewonnen", label: "Gewonnen", list: won },
                { key: "verloren", label: "Verloren", list: lost },
              ]
                .filter((g) => g.list.length > 0)
                .map((g) => (
                  <div key={g.key}>
                    <h2 className="mb-2 text-[13px] font-semibold text-muted">
                      {g.label} · {g.list.length}
                    </h2>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{g.list.map(card)}</div>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {/* Beim Ziehen: Ablageflächen für den Abschluss (öffnen danach den passenden Dialog) */}
      {dragging !== null && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-h)+12px)] z-30 flex justify-center px-4 lg:bottom-6 lg:pl-64">
          <div className="material-light flex gap-2 rounded-[22px] p-2 shadow-[var(--shadow-pop)]">
            {[
              { key: "gewonnen", label: "Gewonnen", sub: "zum Kunden machen", icon: UserCheck, tone: "bg-ok-soft text-ok" },
              { key: "verloren", label: "Verloren", sub: "mit Grund", icon: UserX, tone: "bg-fill text-ink-2" },
            ].map((z) => (
              <div
                key={z.key}
                {...drop(z.key)}
                className={cn(
                  "pointer-events-auto flex min-w-44 items-center gap-2.5 rounded-[16px] px-4 py-3 transition-[box-shadow,transform]",
                  z.tone,
                  over === z.key && "scale-[1.03] ring-2 ring-current",
                )}
              >
                <z.icon className="size-5 shrink-0" aria-hidden />
                <div className="leading-tight">
                  <div className="text-[14px] font-semibold">{z.label}</div>
                  <div className="text-[12px] opacity-80">{z.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
