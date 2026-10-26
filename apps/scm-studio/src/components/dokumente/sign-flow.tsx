"use client";
// Unterschreiben am Gerät (Handy/Tablet am Set) im Vollbild, Schritt für Schritt:
// 1. Lesen und Auswahl bestätigen, 2. je Person unterschreiben (Fläche füllt den Bildschirm), 3. prüfen und abschließen.
// Texte an die unterschreibende Person in der Sie-Form.
import { ArrowLeft, Check, FileText, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { signDocument } from "@/lib/dokumente/actions";
import { SignaturePad, SignaturePreview, type SignatureData, type SignaturePadHandle } from "./signature-pad";

export type SignStep = { role: string; label: string; name: string; nameEditable?: boolean };
type Zweck = { key: string; label: string; text: string };

/** Quer gehaltenes Handy: wenig Höhe, deshalb Nebensachen ausblenden */
const SHORT = "[@media(max-height:500px)]:hidden";

export function SignFlow({
  docId,
  title,
  backHref,
  pdfHref,
  steps,
  zwecke,
  initialZwecke,
  defaultPlace,
  children,
}: {
  docId: number;
  title: string;
  backHref: string;
  pdfHref: string;
  steps: SignStep[];
  zwecke?: Zweck[];
  initialZwecke?: string[];
  defaultPlace?: string;
  children: React.ReactNode;
}) {
  const [index, setIndex] = useState(-1); // -1 lesen, 0..n-1 unterschreiben, n abschließen
  const [read, setRead] = useState(false);
  const [place, setPlace] = useState(defaultPlace ?? "");
  const [chosen, setChosen] = useState<string[]>(initialZwecke ?? []);
  const [names, setNames] = useState<Record<string, string>>(() => Object.fromEntries(steps.map((s) => [s.role, s.name])));
  const [strokes, setStrokes] = useState<Record<string, number[][][]>>({});
  const [raw, setRaw] = useState<Record<string, SignatureData>>({});
  const [drawn, setDrawn] = useState<Record<string, boolean>>({});
  const [pending, start] = useTransition();
  const pad = useRef<SignaturePadHandle>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const confirm = useConfirm();
  const total = steps.length;
  const step = index >= 0 && index < total ? steps[index] : null;
  const stepText = index < 0 ? "Lesen und bestätigen" : index < total ? `Unterschrift ${index + 1} von ${total}` : "Prüfen und abschließen";

  const toggle = (k: string) => setChosen((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  const canStart = read && (!zwecke || chosen.includes("aufnahme"));

  // Beim Schrittwechsel die Überschrift fokussieren (Screenreader und Tastatur starten oben)
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [index]);

  const cancel = useCallback(async () => {
    const started = index >= 0 || Object.keys(raw).length > 0;
    if (started) {
      const ok = await confirm({
        title: "Unterschreiben abbrechen?",
        message: "Die Unterschriften auf diesem Gerät werden verworfen. Das Dokument bleibt bereit zur Unterschrift.",
        confirmLabel: "Abbrechen",
        cancelLabel: "Weiter unterschreiben",
        tone: "danger",
      });
      if (!ok) return;
    }
    router.push(backHref);
  }, [index, raw, confirm, router, backHref]);

  // Escape bricht mit Rückfrage ab (wie ein Dialog)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && !document.querySelector("dialog[open]")) {
        e.preventDefault();
        void cancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancel]);

  /** Striche des aktuellen Schritts merken (für "Zurück" und den letzten Schritt) */
  function keep() {
    if (!step || !pad.current) return;
    const data = pad.current.data();
    setRaw((m) => ({ ...m, [step.role]: data }));
    setStrokes((m) => ({ ...m, [step.role]: pad.current?.strokes() ?? [] }));
  }

  function next() {
    if (!step) return;
    if (!pad.current?.strokes().length) return toast.error("Bitte unterschreiben.");
    if (!names[step.role]?.trim()) return toast.error("Bitte den Namen eintragen.");
    keep();
    setIndex((i) => i + 1);
  }

  function back() {
    keep();
    setIndex((i) => i - 1);
  }

  function submit() {
    const payload = {
      signatures: steps.map((s) => ({ role: s.role, name: names[s.role]?.trim(), strokes: strokes[s.role] })),
      zwecke: zwecke ? chosen : undefined,
      place: place.trim() || undefined,
      readConfirmed: true,
    };
    start(async () => {
      const r = await signDocument(docId, JSON.stringify(payload));
      if (r.ok) {
        toast.success(r.message ?? "Unterschrieben");
        router.replace(r.redirectTo ?? backHref);
      } else toast.error(r.error ?? "Das hat nicht geklappt.");
    });
  }

  const bar = "border-t border-hairline bg-white/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur sm:px-6";

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white text-ink" role="dialog" aria-modal="true" aria-label={`Unterschreiben: ${title}`}>
      <header className="shrink-0 border-b border-hairline bg-white px-4 pt-[env(safe-area-inset-top)] sm:px-6">
        <div className="flex h-14 items-center gap-3">
          <Image src="/logo-dark.svg" alt="SCM Creatives" width={64} height={22} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold">{title}</div>
            <div className="text-[13px] text-muted" aria-live="polite">
              {stepText}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void cancel()}
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-fill-2 hover:text-ink"
            aria-label="Unterschreiben abbrechen"
          >
            <X className="size-5" />
          </button>
        </div>
        <ol className={cn("flex gap-1.5 pb-3", SHORT)} aria-hidden>
          {[-1, ...steps.map((_, i) => i), total].map((i) => (
            <li key={i} className={cn("h-1 flex-1 rounded-full", i <= index ? "bg-accent" : "bg-fill")} />
          ))}
        </ol>
      </header>

      {index < 0 && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto grid max-w-2xl gap-6 px-4 py-6 sm:px-6">
              <h2 ref={heading} tabIndex={-1} className="sr-only">
                Lesen und bestätigen
              </h2>
              <div className="grid gap-3 text-[16px] leading-relaxed text-ink-2">{children}</div>
              <a
                href={pdfHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 self-start text-[15px] font-semibold text-accent-ink underline-offset-4 hover:underline"
              >
                <FileText className="size-4" aria-hidden /> Vollständigen Text als PDF öffnen
              </a>
              {zwecke && (
                <fieldset className="grid gap-2">
                  <legend className="mb-2 text-[17px] font-semibold">Wofür willigen Sie ein?</legend>
                  <div className="divide-y divide-hairline overflow-hidden rounded-2xl bg-sunken">
                    {zwecke.map((z) => (
                      <label key={z.key} className="flex cursor-pointer gap-3.5 px-4 py-3.5 transition-colors has-[:focus-visible]:bg-fill-2 active:bg-fill-2">
                        <input type="checkbox" className="mt-0.5 size-[22px] shrink-0 accent-[var(--color-accent)]" checked={chosen.includes(z.key)} onChange={() => toggle(z.key)} />
                        <span>
                          <span className="block text-[16px] font-semibold">{z.label}</span>
                          <span className="block text-[14px] leading-snug text-muted">{z.text}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {!chosen.includes("aufnahme") && (
                    <p className="text-[14px] font-medium text-accent-ink">Ohne Einwilligung in die Aufnahme bitte nicht unterschreiben. Sie werden dann nicht gefilmt.</p>
                  )}
                </fieldset>
              )}
              <Field label="Ort der Unterschrift" optional>
                <Input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="z. B. Kiel" autoComplete="address-level2" />
              </Field>
              <label className="flex cursor-pointer items-start gap-3.5 rounded-2xl bg-sunken p-4 has-[:focus-visible]:bg-fill-2">
                <input type="checkbox" className="mt-0.5 size-[22px] shrink-0 accent-[var(--color-accent)]" checked={read} onChange={(e) => setRead(e.target.checked)} />
                <span className="text-[16px]">Ich habe den Text gelesen und bin mit der Unterschrift am Gerät einverstanden.</span>
              </label>
            </div>
          </div>
          <div className={bar}>
            <div className="mx-auto flex max-w-2xl justify-end">
              <Button className="h-12 w-full px-6 text-[16px] sm:w-auto" disabled={!canStart} onClick={() => setIndex(0)}>
                Weiter zur Unterschrift
              </Button>
            </div>
          </div>
        </>
      )}

      {step && (
        <>
          <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-3 px-4 pt-4 sm:px-6" key={step.role}>
            <h2 ref={heading} tabIndex={-1} className="text-[20px] font-semibold outline-none [@media(max-height:500px)]:sr-only">
              {step.label}
            </h2>
            <label className="flex items-center gap-3">
              <span className="shrink-0 text-[13px] font-medium text-ink-2">Name</span>
              <Input
                value={names[step.role] ?? ""}
                readOnly={!step.nameEditable}
                onChange={(e) => setNames((n) => ({ ...n, [step.role]: e.target.value }))}
                placeholder="Vor- und Nachname"
                className={cn(!step.nameEditable && "bg-fill-2 text-ink-2")}
                autoComplete="off"
              />
            </label>
            <SignaturePad
              ref={pad}
              fill
              label={names[step.role] || step.label}
              initial={raw[step.role]}
              onChange={(empty) => setDrawn((m) => ({ ...m, [step.role]: !empty }))}
            />
            <p className="-mt-1 text-center text-[13px] text-muted sm:hidden [@media(orientation:landscape)]:hidden">Tipp: Quer gehalten wird die Fläche breiter.</p>
          </div>
          <div className={bar}>
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
              <Button variant="ghost" className="h-12" onClick={back}>
                <ArrowLeft className="size-4" /> Zurück
              </Button>
              <Button className="h-12 px-6 text-[16px]" disabled={!drawn[step.role]} onClick={next}>
                {index + 1 < total ? "Weiter" : "Fertig"}
              </Button>
            </div>
          </div>
        </>
      )}

      {index >= total && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto grid max-w-2xl gap-5 px-4 py-6 sm:px-6">
              <h2 ref={heading} tabIndex={-1} className="text-[22px] font-semibold outline-none">
                Alles bereit
              </h2>
              <ul className="divide-y divide-hairline overflow-hidden rounded-2xl bg-sunken">
                {steps.map((s) => (
                  <li key={s.role} className="flex items-center gap-3 px-4 py-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ok-soft text-ok">
                      <Check className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{names[s.role]}</span>
                      <span className="block text-[13px] text-muted">{s.label}</span>
                    </span>
                    <SignaturePreview strokes={strokes[s.role] ?? []} className="h-12 w-28 shrink-0 text-ink" />
                  </li>
                ))}
              </ul>
              <p className="text-[14px] text-muted">
                Beim Abschließen werden Zeitpunkt, Ort, Gerät und ein Prüfwert der Fassung festgehalten. Danach lässt sich das Dokument nicht mehr ändern.
              </p>
            </div>
          </div>
          <div className={bar}>
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
              <Button variant="ghost" className="h-12" onClick={() => setIndex(total - 1)} disabled={pending}>
                <ArrowLeft className="size-4" /> Zurück
              </Button>
              <Button className="h-12 px-6 text-[16px]" onClick={submit} disabled={pending} aria-busy={pending}>
                {pending ? "Wird abgelegt …" : "Unterschrift abschließen"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
