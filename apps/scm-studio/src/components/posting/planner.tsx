"use client";
// Posting-Kalender im Stil des Meta-Planers: links fertige Videos („Bereit zum Posten“), rechts Woche oder Monat.
// Am Computer per Ziehen und Ablegen auf einen Tag, überall per Antippen mit Dialog (Datum, Uhrzeit, Plattform, Caption).
import { CalendarClock, Check, ExternalLink, GripVertical, Plus, Undo2 } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ActionForm } from "@/components/ui/action-form";
import { ClientAvatar } from "@/components/crm/client-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormActions, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { PLATFORMS } from "@/lib/labels";
import { markPosted, movePost, schedulePost, unschedulePost } from "@/lib/posting/actions";
import type { PostItem } from "@/lib/posting/data";

const WD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const timeOf = (iso: string) => new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const dayNum = (d: string) => Number(d.slice(8));
const dateLabel = (d: string) => new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

/** Plattform als kurzes Kürzel (Markenlogos gibt es im Symbolsatz nicht). */
function PlatformIcons({ p }: { p: string | null }) {
  const keys = p === "beide" ? ["IG", "TT"] : p === "tiktok" ? ["TT"] : ["IG"];
  return (
    <span className="inline-flex items-center gap-0.5" title={PLATFORMS[p ?? "instagram"]}>
      {keys.map((k) => (
        <span key={k} className="rounded bg-fill px-1 text-[10px] font-bold leading-4 text-ink-2" aria-hidden>
          {k}
        </span>
      ))}
      <span className="sr-only">{PLATFORMS[p ?? "instagram"]}</span>
    </span>
  );
}

type Mode = "woche" | "monat";

export function Planner({ mode, days, month, today, now, posts, queue }: { mode: Mode; days: string[]; month: string; today: string; now: number; posts: PostItem[]; queue: PostItem[] }) {
  const [open, setOpen] = useState<{ item: PostItem; day?: string } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [, start] = useTransition();
  // Verschieben erscheint sofort (optimistisch), der Server bestätigt
  const [items, moveLocal] = useOptimistic(posts, (cur: PostItem[], m: { id: number; day: string }) => {
    const known = cur.find((p) => p.id === m.id) ?? queue.find((q) => q.id === m.id);
    if (!known) return cur;
    return [...cur.filter((p) => p.id !== m.id), { ...known, day: m.day, at: known.at ?? new Date(`${m.day}T17:00:00Z`).toISOString() }];
  });
  const [waiting, dropFromQueue] = useOptimistic(queue, (cur: PostItem[], id: number) => cur.filter((q) => q.id !== id));

  const onDrop = (day: string, e: React.DragEvent) => {
    e.preventDefault();
    setOver(null);
    const id = Number(e.dataTransfer.getData("text/plain"));
    if (!id) return;
    start(async () => {
      moveLocal({ id, day });
      dropFromQueue(id);
      const r = await movePost(id, day);
      if (r.ok) toast.success(r.message);
      else toast.error(r.error ?? "Nicht verschoben.");
    });
  };

  const byDay = (d: string) => items.filter((p) => p.day === d).sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));
  const dropProps = (d: string) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(d);
    },
    onDragLeave: () => setOver((o) => (o === d ? null : o)),
    onDrop: (e: React.DragEvent) => onDrop(d, e),
  });

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      {/* Bereit zum Posten */}
      <Card className="grid gap-3 p-4 xl:sticky xl:top-4">
        <div>
          <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Bereit zum Posten</h2>
          <p className="text-[13px] text-muted">Fertige Videos ohne Termin. Auf einen Tag ziehen oder antippen.</p>
        </div>
        {waiting.length === 0 ? (
          <p className="rounded-xl bg-fill-2 px-3 py-5 text-center text-[13px] text-muted">Alles eingeplant. Neue Videos erscheinen hier, sobald sie im Schnitt auf „Fertig“ stehen.</p>
        ) : (
          <ul className="grid gap-2">
            {waiting.map((q) => (
              <li
                key={q.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", String(q.id));
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="group"
              >
                <button
                  type="button"
                  onClick={() => setOpen({ item: q, day: today })}
                  className="flex w-full items-center gap-2 rounded-xl bg-fill-2 px-3 py-2.5 text-left transition-colors hover:bg-fill"
                >
                  <GripVertical className="hidden size-4 shrink-0 text-muted lg:block" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[12px] text-muted">
                      <ClientAvatar client={{ id: q.clientId, name: q.clientName, color: q.clientColor, logoPath: q.clientLogo }} size={18} />
                      <span className="truncate">{q.clientName}</span>
                    </span>
                    <span className="block truncate text-[14px] font-semibold text-ink">{q.title}</span>
                  </span>
                  <Plus className="size-4 shrink-0 text-muted" aria-hidden />
                  <span className="sr-only">einplanen</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Kalender */}
      <div className="min-w-0">
        {mode === "woche" ? (
          <>
            {/* Computer: sieben Spalten */}
            <div className="hidden grid-cols-7 gap-2 md:grid">
              {days.map((d, i) => (
                <section
                  key={d}
                  {...dropProps(d)}
                  aria-label={dateLabel(d)}
                  className={cn("flex min-h-[420px] flex-col rounded-2xl bg-fill-2 p-2 transition-colors", over === d && "bg-fill outline-2 outline-ink/30", d < today && "opacity-80")}
                >
                  <header className="mb-2 flex items-baseline gap-1.5 px-1">
                    <span className="text-[12px] font-semibold uppercase text-muted">{WD[i]}</span>
                    <span className={cn("grid size-7 place-items-center rounded-full text-[15px] font-semibold", d === today ? "bg-accent text-white" : "text-ink")}>{dayNum(d)}</span>
                  </header>
                  <div className="grid content-start gap-1.5">
                    {byDay(d).map((p) => (
                      <PostCard key={p.id} p={p} now={now} onOpen={() => setOpen({ item: p })} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
            {/* Handy: Liste je Tag */}
            <div className="grid gap-3 md:hidden">
              {days.map((d) => (
                <section key={d} aria-label={dateLabel(d)} className="grid gap-1.5">
                  <h3 className={cn("px-1 text-[15px] font-semibold", d === today ? "text-accent-ink" : "text-ink")}>{dateLabel(d)}</h3>
                  {byDay(d).length === 0 ? (
                    <button type="button" onClick={() => waiting[0] && setOpen({ item: waiting[0], day: d })} className="rounded-xl bg-fill-2 px-3 py-3 text-left text-[13px] text-muted" disabled={!waiting[0]}>
                      {waiting[0] ? "Nichts geplant. Antippen, um das nächste fertige Video hier einzuplanen." : "Nichts geplant."}
                    </button>
                  ) : (
                    byDay(d).map((p) => <PostCard key={p.id} p={p} now={now} onOpen={() => setOpen({ item: p })} wide />)
                  )}
                </section>
              ))}
            </div>
          </>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-7 gap-px overflow-hidden rounded-2xl bg-line">
              {WD.map((w) => (
                <div key={w} className="bg-surface px-2 py-1.5 text-[12px] font-semibold uppercase text-muted">
                  {w}
                </div>
              ))}
              {days.map((d) => {
                const list = byDay(d);
                return (
                  <section
                    key={d}
                    {...dropProps(d)}
                    aria-label={dateLabel(d)}
                    className={cn("min-h-28 bg-surface p-1.5 transition-colors", d.slice(0, 7) !== month && "bg-sunken text-muted", over === d && "bg-fill")}
                  >
                    <div className={cn("mb-1 grid size-6 place-items-center rounded-full text-[12px] font-semibold", d === today && "bg-accent text-white")}>{dayNum(d)}</div>
                    <div className="grid gap-1">
                      {list.slice(0, 4).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          draggable={p.status !== "online"}
                          onDragStart={(e) => e.dataTransfer.setData("text/plain", String(p.id))}
                          onClick={() => setOpen({ item: p })}
                          className={cn(
                            "flex min-h-7 items-center gap-1 truncate rounded-md px-1.5 text-left text-[12px] font-medium",
                            p.status === "online" ? "bg-ok-soft text-ok" : p.at && new Date(p.at).getTime() < now ? "bg-warn-soft text-warn" : "bg-fill text-ink",
                          )}
                          title={`${p.clientName}: ${p.title}`}
                        >
                          <span className="size-1.5 shrink-0 rounded-full" style={{ background: p.clientColor }} aria-hidden />
                          {p.at && <span className="tabular-nums">{timeOf(p.at)}</span>}
                          <span className="truncate">{p.title}</span>
                        </button>
                      ))}
                      {list.length > 4 && <span className="px-1 text-[12px] text-muted">+{list.length - 4} weitere</span>}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {open && <PostDialog key={`${open.item.id}-${open.day ?? ""}`} item={open.item} day={open.day} onClose={() => setOpen(null)} />}
    </div>
  );
}

function PostCard({ p, now, onOpen, wide }: { p: PostItem; now: number; onOpen: () => void; wide?: boolean }) {
  const overdue = p.status !== "online" && p.at && new Date(p.at).getTime() < now;
  return (
    <button
      type="button"
      draggable={p.status !== "online"}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(p.id));
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onOpen}
      className={cn(
        "grid gap-1 rounded-xl border-l-4 bg-surface p-2 text-left shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-raised)]",
        wide && "p-3",
      )}
      style={{ borderLeftColor: p.clientColor }}
    >
      <span className="flex items-center gap-1.5 text-[12px] text-muted">
        {p.at ? <span className="font-semibold tabular-nums text-ink-2">{timeOf(p.at)}</span> : <span>Gepostet</span>}
        <PlatformIcons p={p.platform} />
        {p.status === "online" ? (
          <Check className="ml-auto size-3.5 text-ok" aria-label="Gepostet" />
        ) : overdue ? (
          <span className="ml-auto text-[11px] font-semibold text-warn">offen</span>
        ) : null}
      </span>
      <span className={cn("line-clamp-2 text-[13px] font-semibold leading-snug text-ink", wide && "text-[15px]")}>{p.title}</span>
      <span className="flex min-w-0 items-center gap-1 text-[11px] text-muted">
        <ClientAvatar client={{ id: p.clientId, name: p.clientName, color: p.clientColor, logoPath: p.clientLogo }} size={16} />
        <span className="truncate">{p.clientName}</span>
      </span>
    </button>
  );
}

function PostDialog({ item, day, onClose }: { item: PostItem; day?: string; onClose: () => void }) {
  const [, start] = useTransition();
  const online = item.status === "online";
  const initialDay = day ?? item.day;
  const initialTime = item.at ? timeOf(item.at) : "18:00";
  return (
    <Dialog open onClose={onClose} title={item.title} description={`${item.clientName}${item.format ? ` · ${item.format}` : ""}`} size="lg">
      <div className="grid gap-5">
        {online ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-[14px] text-ok">
            <Check className="size-4" aria-hidden /> Gepostet am {initialDay.split("-").reverse().join(".")}
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-semibold hover:underline">
                Beitrag öffnen <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </div>
        ) : (
          <ActionForm action={schedulePost.bind(null, item.id)} onSuccess={onClose}>
            <FormGrid>
              <Field label="Datum" name="day">
                <Input type="date" name="day" defaultValue={initialDay} required />
              </Field>
              <Field label="Uhrzeit" name="time">
                <Input type="time" name="time" defaultValue={initialTime} step={300} required />
              </Field>
              <Field label="Plattform" name="platform" className="sm:col-span-2">
                <Select name="platform" defaultValue={item.platform ?? "instagram"}>
                  {Object.entries(PLATFORMS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Caption" name="caption" optional hint="Vorlage aus dem Skript, hier für den Post anpassen" className="sm:col-span-2">
                <Textarea name="caption" defaultValue={item.caption} rows={5} maxLength={2200} />
              </Field>
            </FormGrid>
            <FormActions>
              <SubmitButton>
                <CalendarClock className="size-4" aria-hidden /> {item.at ? "Termin speichern" : "Einplanen"}
              </SubmitButton>
            </FormActions>
          </ActionForm>
        )}

        {!online && item.at && (
          <div className="grid gap-3 border-t border-hairline pt-4">
            <h3 className="text-[15px] font-semibold">Gepostet?</h3>
            <ActionForm action={markPosted.bind(null, item.id)} onSuccess={onClose} className="grid gap-3 sm:flex sm:items-end">
              <Field label="Link zum Beitrag" name="url" optional hint="Für die Zahlen" className="min-w-0 flex-1">
                <Input type="url" name="url" inputMode="url" defaultValue={item.url ?? ""} placeholder="https://www.instagram.com/reel/…" />
              </Field>
              <SubmitButton variant="secondary">
                <Check className="size-4" aria-hidden /> Als gepostet markieren
              </SubmitButton>
            </ActionForm>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-4">
          <Link href={`/produktion/${item.id}`} className="text-[14px] font-semibold text-accent-ink hover:underline">
            Zum Video
          </Link>
          {!online && item.at && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                start(async () => {
                  const r = await unschedulePost(item.id);
                  if (r.ok) {
                    toast.success(r.message);
                    onClose();
                  } else toast.error(r.error ?? "Nicht geändert.");
                })
              }
            >
              <Undo2 className="size-4" aria-hidden /> Aus dem Kalender nehmen
            </Button>
          )}
          {online && <Badge tone="ok">Online</Badge>}
        </div>
      </div>
    </Dialog>
  );
}
