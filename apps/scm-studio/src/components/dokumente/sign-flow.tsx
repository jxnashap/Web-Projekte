"use client";
// Unterschreiben am Gerät (Handy/Tablet am Set): Vollbild, große Fläche, Schritt für Schritt.
// 1. Lesen und Auswahl bestätigen, 2. je Person unterschreiben, 3. abschließen.
import { ArrowLeft, Check, FileText, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signDocument } from "@/lib/dokumente/actions";
import { cn } from "@/lib/cn";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";

export type SignStep = { role: string; label: string; name: string; nameEditable?: boolean };
type Zweck = { key: string; label: string; text: string };

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
  const [empty, setEmpty] = useState(true);
  const [pending, start] = useTransition();
  const pad = useRef<SignaturePadHandle>(null);
  const router = useRouter();
  const total = steps.length;
  const step = index >= 0 && index < total ? steps[index] : null;

  const toggle = (k: string) => setChosen((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  const canStart = read && (!zwecke || chosen.includes("aufnahme"));

  function next() {
    if (!step) return;
    const s = pad.current?.strokes() ?? [];
    if (!s.length) return toast.error("Bitte unterschreiben.");
    if (!names[step.role]?.trim()) return toast.error("Bitte den Namen eintragen.");
    setStrokes((m) => ({ ...m, [step.role]: s }));
    setEmpty(true);
    setIndex((i) => i + 1);
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

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-white text-ink" role="dialog" aria-modal="true" aria-label={`Unterschreiben: ${title}`}>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <Image src="/logo-dark.svg" alt="SCM Creatives" width={64} height={22} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{title}</div>
          <div className="text-[12px] text-muted">
            {index < 0 ? "Lesen" : index < total ? `Unterschrift ${index + 1} von ${total}` : "Abschließen"}
          </div>
        </div>
        <Link href={backHref} className="grid size-10 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink" aria-label="Abbrechen">
          <X className="size-5" />
        </Link>
      </header>

      <div className="mx-auto grid max-w-2xl gap-6 px-4 py-6 pb-16 sm:px-6">
        <ol className="flex gap-1.5" aria-hidden>
          {[-1, ...steps.map((_, i) => i), total].map((i) => (
            <li key={i} className={cn("h-1 flex-1 rounded-full", i <= index ? "bg-accent" : "bg-sunken")} />
          ))}
        </ol>

        {index < 0 && (
          <>
            <div className="grid gap-3 text-[15px] leading-relaxed text-ink-2">{children}</div>
            <a href={pdfHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[14px] font-semibold text-ink underline-offset-4 hover:underline">
              <FileText className="size-4" /> Vollständigen Text als PDF öffnen
            </a>
            {zwecke && (
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-[15px] font-semibold">Wofür willigen Sie ein?</legend>
                {zwecke.map((z) => (
                  <label
                    key={z.key}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors",
                      chosen.includes(z.key) ? "border-accent bg-accent-soft/40" : "border-line-2 hover:border-faint",
                    )}
                  >
                    <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--color-accent)]" checked={chosen.includes(z.key)} onChange={() => toggle(z.key)} />
                    <span>
                      <span className="block font-semibold">{z.label}</span>
                      <span className="block text-[14px] text-muted">{z.text}</span>
                    </span>
                  </label>
                ))}
                {!chosen.includes("aufnahme") && (
                  <p className="text-[13px] font-medium text-accent-ink">Ohne Einwilligung in die Aufnahme bitte nicht unterschreiben. Die Person wird dann nicht gefilmt.</p>
                )}
              </fieldset>
            )}
            <label className="grid gap-1.5">
              <span className="text-[13px] font-semibold text-ink-2">Ort der Unterschrift</span>
              <input value={place} onChange={(e) => setPlace(e.target.value)} className="h-12 rounded-xl border border-line-2 px-3 text-[16px] focus:border-ink focus:outline-none" placeholder="z. B. Kiel" />
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line-2 p-4">
              <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--color-accent)]" checked={read} onChange={(e) => setRead(e.target.checked)} />
              <span className="text-[15px]">Ich habe den Text gelesen und bin mit der Unterschrift am Gerät einverstanden.</span>
            </label>
            <Button className="h-12 text-[15px]" disabled={!canStart} onClick={() => setIndex(0)}>
              Weiter zur Unterschrift
            </Button>
          </>
        )}

        {step && (
          <div className="grid gap-4" key={step.role}>
            <h2 className="text-[20px] font-semibold">{step.label}</h2>
            <label className="grid gap-1.5">
              <span className="text-[13px] font-semibold text-ink-2">Name in Druckbuchstaben</span>
              <input
                value={names[step.role] ?? ""}
                readOnly={!step.nameEditable}
                onChange={(e) => setNames((n) => ({ ...n, [step.role]: e.target.value }))}
                className={cn("h-12 rounded-xl border border-line-2 px-3 text-[16px] focus:border-ink focus:outline-none", !step.nameEditable && "bg-sunken")}
              />
            </label>
            <SignaturePad ref={pad} label={names[step.role] || step.label} onChange={setEmpty} />
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="ghost" onClick={() => setIndex((i) => i - 1)}>
                <ArrowLeft className="size-4" /> Zurück
              </Button>
              <Button className="h-12 px-6 text-[15px]" disabled={empty} onClick={next}>
                {index + 1 < total ? "Weiter" : "Fertig"}
              </Button>
            </div>
          </div>
        )}

        {index >= total && (
          <div className="grid gap-5">
            <h2 className="text-[20px] font-semibold">Alles bereit</h2>
            <ul className="grid gap-2">
              {steps.map((s) => (
                <li key={s.role} className="flex items-center gap-3 rounded-2xl border border-line p-4">
                  <span className="grid size-8 place-items-center rounded-full bg-ok-soft text-ok">
                    <Check className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{names[s.role]}</span>
                    <span className="block text-[13px] text-muted">{s.label}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-muted">
              Beim Abschließen werden Zeitpunkt, Ort, Gerät und ein Prüfwert der Fassung festgehalten. Danach lässt sich das Dokument nicht mehr ändern.
            </p>
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="ghost" onClick={() => setIndex(total - 1)} disabled={pending}>
                <ArrowLeft className="size-4" /> Zurück
              </Button>
              <Button className="h-12 px-6 text-[15px]" onClick={submit} disabled={pending} aria-busy={pending}>
                {pending ? "Wird abgelegt …" : "Unterschrift abschließen"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
