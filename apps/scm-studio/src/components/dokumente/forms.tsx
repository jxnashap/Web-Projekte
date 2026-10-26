"use client";
// Formulare der vier Dokumentarten. Zustand nur dort, wo das Formular reagiert (z. B. minderjährig → Sorgeberechtigte).
// Im Entwurf gibt es eine klebende Leiste mit "Speichern" (Hauptaktion) und "Zur Unterschrift freigeben" bzw.
// "Abschließen und ablegen": Beide senden dasselbe Formular, damit keine ungespeicherte Änderung verloren geht.
import { Check, Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLeaveGuard } from "@/components/ui/use-leave-guard";
import { ActionForm, FieldError, useFormCtx } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { useConfirm, type ConfirmOptions } from "@/components/ui/confirm";
import { Checkbox, Field, FormActions, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/cn";
import {
  defaultEinwilligung,
  finalizeLabel,
  GEBIET,
  LEISTUNGEN,
  needsSignature,
  NUTZUNGSDAUER,
  PLATTFORMEN,
  ROLLEN,
  ZWECKE,
  zweckKeysFor,
  type DocKind,
  type DrehplanData,
  type EinwilligungData,
  type MonatsberichtData,
  type VertragData,
} from "@/lib/dokumente/schema";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

function Group({ title, hint, children }: { title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t border-hairline pt-5 first:border-t-0 first:pt-0">
      <legend className="contents">
        <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{title}</span>
      </legend>
      {hint && <p className="-mt-2 text-[13px] text-muted">{hint}</p>}
      {children}
    </fieldset>
  );
}

export function Hint({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" }) {
  return (
    <p role={tone === "warn" ? "status" : undefined} className={cn("flex gap-2 rounded-xl px-3 py-2.5 text-[13px]", tone === "warn" ? "bg-warn-soft text-warn" : "bg-info-soft text-info")}>
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Mehrfachauswahl als gefüllte Kapseln (gewählt: dunkel mit Häkchen), ohne Rahmen. */
function CheckGroup({ name, options, selected, onChange }: { name: string; options: Record<string, string>; selected: string[]; onChange?: (v: string[]) => void }) {
  const [sel, setSel] = useState(selected);
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).map(([k, label]) => {
        const on = sel.includes(k);
        return (
          <label
            key={k}
            className={cn(
              "inline-flex min-h-11 cursor-pointer select-none items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[14px] font-medium leading-snug transition-colors sm:min-h-9",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
              on ? "bg-ink text-white" : "bg-fill text-ink hover:bg-[rgb(120_120_128/0.18)]",
            )}
          >
            <input
              type="checkbox"
              name={`${name}[]`}
              value={k}
              checked={on}
              onChange={(e) => {
                const next = e.target.checked ? [...sel, k] : sel.filter((x) => x !== k);
                setSel(next);
                onChange?.(next);
              }}
              className="sr-only"
            />
            {on && <Check className="size-4 shrink-0" strokeWidth={2.6} aria-hidden />}
            {label}
          </label>
        );
      })}
    </div>
  );
}

/** Beschriftete Gruppe ohne <label>-Hülle (für Ankreuzlisten, die eigene Labels haben) */
function ChoiceField({ label, name, children }: { label: string; name: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5" role="group" aria-label={label}>
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      <FieldError name={name} />
    </div>
  );
}

function TitleField({ value }: { value: string }) {
  return (
    <Field label="Titel" name="title">
      <Input name="title" defaultValue={value} required />
    </Field>
  );
}

// ------------------------------------------------------------------
// Klebende Leiste im Entwurf: Speichern, Festhalten, Hinweis auf ungespeicherte Änderungen
// ------------------------------------------------------------------
const FINALIZE_CONFIRM: Record<"legal" | "report", ConfirmOptions> = {
  legal: {
    title: "Zur Unterschrift freigeben?",
    message: "Eure Eingaben werden gespeichert und als Fassung festgehalten. Danach wird nur noch unterschrieben. Ändern geht dann über „Wieder bearbeiten“.",
    confirmLabel: "Freigeben",
    cancelLabel: "Weiter bearbeiten",
    tone: "default",
  },
  report: {
    title: "Abschließen und ablegen?",
    message: "Eure Eingaben werden gespeichert, das PDF wird mit den aktuellen Zahlen abgelegt. Ändern geht dann über „Wieder bearbeiten“.",
    confirmLabel: "Abschließen",
    cancelLabel: "Weiter bearbeiten",
    tone: "default",
  },
};

/**
 * Beobachtet das umgebende Formular: geändert seit dem letzten erfolgreichen Speichern? Und kam das laufende
 * Absenden vom Knopf "Freigeben" (für den passenden Ladetext)?
 */
function useDraftForm(ref: React.RefObject<HTMLElement | null>) {
  const { state } = useFormCtx();
  const stateRef = useRef(state);
  const [changedAt, setChangedAt] = useState<ActionState | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const mark = () => setChangedAt(stateRef.current);
    const onSubmit = (e: SubmitEvent) => setFinalizing((e.submitter as HTMLButtonElement | null)?.value === "final");
    form.addEventListener("input", mark);
    form.addEventListener("change", mark);
    form.addEventListener("submit", onSubmit);
    return () => {
      form.removeEventListener("input", mark);
      form.removeEventListener("change", mark);
      form.removeEventListener("submit", onSubmit);
    };
  }, [ref]);
  return { dirty: changedAt !== null && !(state.ok && state !== changedAt), finalizing };
}

function FinalizeButton({ kind, finalizing }: { kind: DocKind; finalizing: boolean }) {
  const ask = useConfirm();
  const { pending } = useFormCtx();
  const mine = pending && finalizing;
  return (
    <Button
      type="submit"
      name="intent"
      value="final"
      variant="secondary"
      className="order-1 max-sm:flex-1"
      disabled={pending}
      aria-busy={mine}
      onClick={async (e) => {
        e.preventDefault();
        const btn = e.currentTarget;
        if (await ask(FINALIZE_CONFIRM[needsSignature(kind) ? "legal" : "report"])) btn.form?.requestSubmit(btn);
      }}
    >
      {mine ? (
        needsSignature(kind) ? "Wird freigegeben …" : "Wird abgelegt …"
      ) : (
        <>
          {/* auf dem Handy kurz, damit beide Knöpfe in eine Zeile passen */}
          <span className="sm:hidden">{needsSignature(kind) ? "Freigeben" : "Ablegen"}</span>
          <span className="max-sm:hidden">{finalizeLabel(kind)}</span>
        </>
      )}
    </Button>
  );
}

function DraftBar({ kind }: { kind: DocKind }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { dirty, finalizing } = useDraftForm(ref);
  useLeaveGuard(dirty, { message: "Was ihr an diesem Dokument geändert habt, ist noch nicht gespeichert." });
  return (
    <FormActions className="sticky bottom-[calc(var(--tabbar-h,calc(54px+env(safe-area-inset-bottom)))+12px)] z-20 -mx-2 rounded-[18px] px-3 py-2.5 bg-surface/95 shadow-[var(--shadow-pop)] backdrop-blur-xl sm:-mx-3 lg:bottom-4">
      <span ref={ref} aria-live="polite" className={cn("basis-full text-[13px] text-muted sm:mr-auto sm:basis-auto", !dirty && "max-sm:hidden")}>
        {dirty ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-warn" aria-hidden /> Nicht gespeichert
          </span>
        ) : (
          <span className="max-sm:hidden">Gespeichert</span>
        )}
      </span>
      {/* Speichern steht im Formular zuerst (Eingabetaste speichert), erscheint aber rechts */}
      <SubmitButton className="order-2 max-sm:flex-1">Speichern</SubmitButton>
      <FinalizeButton kind={kind} finalizing={finalizing} />
    </FormActions>
  );
}

// ------------------------------------------------------------------
export function VertragForm({ action, title, data, isMerchant, clientName }: { action: Action; title: string; data: VertragData; isMerchant: boolean; clientName: string }) {
  const [leistungen, setLeistungen] = useState<string[]>(data.leistungen);
  const [avv, setAvv] = useState(data.avv);
  const posting = leistungen.includes("posting");
  return (
    <ActionForm action={action} className="grid gap-6">
      <TitleField value={title} />
      <Group title="Paket und Laufzeit">
        <FormGrid>
          <Field label="Videos pro Monat" name="paketVideos">
            <Input name="paketVideos" type="number" min={1} max={60} inputMode="numeric" defaultValue={data.paketVideos} />
          </Field>
          <Field label="Preis pro Monat (netto, Euro)" name="preisEuro" hint="Aus dem Kundenpaket übernommen">
            <Input name="preisEuro" inputMode="decimal" defaultValue={data.preisEuro} placeholder="900,00" />
          </Field>
          <Field label="Beginn" name="beginn">
            <Input name="beginn" type="date" defaultValue={data.beginn} />
          </Field>
          <Field label="Mindestlaufzeit (Monate)" name="mindestlaufzeitMonate">
            <Input name="mindestlaufzeitMonate" type="number" min={1} max={36} defaultValue={data.mindestlaufzeitMonate} />
          </Field>
          <Field label="Kündigungsfrist (Wochen)" name="kuendigungsfristWochen" hint="zum Ende der Mindestlaufzeit oder eines Verlängerungsmonats">
            <Input name="kuendigungsfristWochen" type="number" min={0} max={26} defaultValue={data.kuendigungsfristWochen} />
          </Field>
          <Field label="Drehtage pro Monat" name="drehtageProMonat">
            <Input name="drehtageProMonat" type="number" min={0} max={20} defaultValue={data.drehtageProMonat} />
          </Field>
        </FormGrid>
      </Group>

      <Group title="Leistungen" hint="Videos sind Werkleistung mit Abnahme, alles Begleitende ist Dienstleistung.">
        <CheckGroup name="leistungen" options={LEISTUNGEN} selected={data.leistungen} onChange={setLeistungen} />
      </Group>

      <Group title="Freigabe und Abnahme">
        <FormGrid>
          <Field label="Korrekturschleifen je Video" name="korrekturschleifen">
            <Input name="korrekturschleifen" type="number" min={0} max={10} defaultValue={data.korrekturschleifen} />
          </Field>
          <Field label="Prüffrist (Werktage)" name="freigabeTage">
            <Input name="freigabeTage" type="number" min={1} max={30} defaultValue={data.freigabeTage} />
          </Field>
        </FormGrid>
      </Group>

      <Group title="Nutzungsrechte" hint="Alles, was hier nicht steht, ist nicht eingeräumt (§ 31 Abs. 5 UrhG). Rohmaterial bleibt bei SCM.">
        <ChoiceField label="Plattformen" name="plattformen">
          <CheckGroup name="plattformen" options={PLATTFORMEN} selected={data.plattformen} />
        </ChoiceField>
        <div className="grid gap-x-6 sm:grid-cols-2">
          <Checkbox name="organisch" label="Organische Beiträge" defaultChecked={data.organisch} />
          <Checkbox name="werbung" label="Bezahlte Werbeanzeigen" defaultChecked={data.werbung} />
          <Checkbox name="exklusiv" label="Ausschließlich (exklusiv)" defaultChecked={data.exklusiv} />
          <Checkbox name="bearbeitung" label="Kunde darf kürzen und zuschneiden" defaultChecked={data.bearbeitung} />
          <Checkbox name="portfolio" label="SCM darf als Referenz zeigen" defaultChecked={data.portfolio} />
        </div>
        <FormGrid>
          <Field label="Dauer" name="nutzungsdauer">
            <Select name="nutzungsdauer" defaultValue={data.nutzungsdauer}>
              {Object.entries(NUTZUNGSDAUER).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Gebiet" name="gebiet">
            <Select name="gebiet" defaultValue={data.gebiet}>
              {Object.entries(GEBIET).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
      </Group>

      <Group title="Personen, KI und Datenschutz">
        <Field label="Einwilligungen der gefilmten Personen holt" name="einwilligungenDurch">
          <Select name="einwilligungenDurch" defaultValue={data.einwilligungenDurch}>
            <option value="scm">SCM (mit dem Formular in SCM Studio)</option>
            <option value="kunde">Der Kunde (SCM stellt das Formular bereit)</option>
          </Select>
        </Field>
        <Field label="Künstliche Intelligenz" name="ki" hint="SCM hat festgelegt, Videos ohne KI zu produzieren. Kennzeichnungspflichten nach Art. 50 KI-Verordnung bleiben.">
          <Select name="ki" defaultValue={data.ki}>
            <option value="keine">Ohne KI-generierte Inhalte</option>
            <option value="absprache">KI nur nach Absprache, mit Kennzeichnung</option>
          </Select>
        </Field>
        <Checkbox name="avv" label="SCM betreut Kundenkonten mit personenbezogenen Daten (AV-Vertrag nötig)" checked={avv || posting} onChange={(e) => setAvv(e.target.checked)} disabled={posting} />
        {posting && <input type="hidden" name="avv" value="on" />}
        {(avv || posting) && <Hint tone="warn">Ein Vertrag zur Auftragsverarbeitung (Art. 28 DSGVO) wird als Anlage nötig. Im Vertrag steht dafür ein Platzhalter.</Hint>}
      </Group>

      <Group title="Unterzeichnung und Sonstiges">
        <FormGrid>
          <Field label="Unterschreibt für den Kunden" name="unterzeichnerName" optional>
            <Input name="unterzeichnerName" defaultValue={data.unterzeichnerName} placeholder={clientName} />
          </Field>
          <Field label="Funktion" name="unterzeichnerFunktion" optional>
            <Input name="unterzeichnerFunktion" defaultValue={data.unterzeichnerFunktion} placeholder="z. B. Inhaber, Geschäftsführerin" />
          </Field>
        </FormGrid>
        <Field label="Gerichtsstand" name="gerichtsstand" optional hint={isMerchant ? "Wirksam nur, wenn beide Seiten Kaufleute sind (§ 38 ZPO). Bitte prüfen, ob SCM selbst Kaufmann ist." : "Der Kunde ist nicht als Kaufmann eingetragen. Eine Gerichtsstandsklausel wäre unwirksam und wird nicht gedruckt."}>
          <Input name="gerichtsstand" defaultValue={data.gerichtsstand} disabled={!isMerchant} placeholder={isMerchant ? "z. B. Lübeck" : "nicht möglich"} />
        </Field>
        <Field label="Besondere Vereinbarungen" name="besonderes" optional hint="Absätze mit einer Leerzeile trennen">
          <Textarea name="besonderes" defaultValue={data.besonderes} rows={4} />
        </Field>
      </Group>

      <DraftBar kind="vertrag" />
    </ActionForm>
  );
}

// ------------------------------------------------------------------
/** Probleme der verantwortlichen Stelle je Auswahl (null = vollständig), vom Server berechnet */
export type ControllerIssues = { kunde: string | null; scm: string | null };

export function EinwilligungFields({
  data,
  hasClient,
  issues,
  clientEditHref,
  autoFocusName = false,
}: {
  data: Partial<EinwilligungData>;
  hasClient: boolean;
  issues?: ControllerIssues;
  clientEditHref?: string;
  autoFocusName?: boolean;
}) {
  const [minor, setMinor] = useState(Boolean(data.minderjaehrig));
  const [sole, setSole] = useState(Boolean(data.alleinigesSorgerecht));
  // Wechselt der Auftraggeber (Neu-Formular), gelten für die neue Lage die Standardwerte
  const [initialHasClient] = useState(hasClient);
  const [verantwortlich, setVerantwortlich] = useState<"kunde" | "scm" | null>(initialHasClient ? (data.verantwortlich ?? "kunde") : null);
  const effective = hasClient ? (verantwortlich ?? "kunde") : "scm";
  const issue = issues?.[effective] ?? null;
  const zwecke = zweckKeysFor(hasClient);
  const zweckeSelected = hasClient === initialHasClient ? (data.zwecke ?? ["aufnahme"]) : defaultEinwilligung(data.drehtag ?? "", hasClient).zwecke;
  return (
    <div className="grid gap-6">
      <Group title="Person">
        <FormGrid>
          <Field label="Vor- und Nachname" name="personName">
            <Input name="personName" defaultValue={data.personName} autoComplete="off" autoCapitalize="words" required autoFocus={autoFocusName} />
          </Field>
          <Field label="Rolle im Video" name="rolle">
            <Select name="rolle" defaultValue={data.rolle ?? "gast"}>
              {Object.entries(ROLLEN).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Kontakt" name="kontakt" optional hint="E-Mail oder Telefon, für Rückfragen und Widerruf">
            <Input name="kontakt" defaultValue={data.kontakt} />
          </Field>
          <Field label="Vergütung" name="verguetung" optional hint="nur bei bezahlten Darstellern (§ 22 Satz 2 KUG)">
            <Input name="verguetung" defaultValue={data.verguetung} />
          </Field>
        </FormGrid>
        <Checkbox name="minderjaehrig" label="Die Person ist minderjährig" checked={minor} onChange={(e) => setMinor(e.target.checked)} />
        {minor && (
          <div className="grid gap-4 rounded-2xl bg-sunken p-4">
            <Hint>Bei Minderjährigen willigen die Sorgeberechtigten ein, bei gemeinsamer Sorge beide. Ab etwa 14 Jahren stimmt die Person zusätzlich selbst zu. Bei Kindern unter 15 ist das Jugendarbeitsschutzgesetz zu prüfen.</Hint>
            <FormGrid>
              <Field label="Erziehungsberechtigte Person" name="erziehungsberechtigt1">
                <Input name="erziehungsberechtigt1" defaultValue={data.erziehungsberechtigt1} />
              </Field>
              {!sole && (
                <Field label="Zweite erziehungsberechtigte Person" name="erziehungsberechtigt2">
                  <Input name="erziehungsberechtigt2" defaultValue={data.erziehungsberechtigt2} />
                </Field>
              )}
            </FormGrid>
            <div className="grid gap-x-6 sm:grid-cols-2">
              <Checkbox name="alleinigesSorgerecht" label="Alleiniges Sorgerecht" checked={sole} onChange={(e) => setSole(e.target.checked)} />
              <Checkbox name="ab14" label="Die Person ist 14 oder älter (unterschreibt mit)" defaultChecked={data.ab14} />
            </div>
          </div>
        )}
      </Group>
      <Group title="Dreh">
        <FormGrid>
          <Field label="Drehtag" name="drehtag">
            <Input name="drehtag" type="date" defaultValue={data.drehtag} required />
          </Field>
          <Field label="Ort" name="ort" optional>
            <Input name="ort" defaultValue={data.ort} placeholder="z. B. Kiel, im Laden" />
          </Field>
        </FormGrid>
        <Field label="Vorhaben" name="projekt" optional hint="Was wird gedreht? Kurz und verständlich.">
          <Input name="projekt" defaultValue={data.projekt} placeholder="z. B. Reels für den Mittagstisch" />
        </Field>
        {hasClient ? (
          <Field label="Verantwortlich für die Veröffentlichung" name="verantwortlich" hint={issue ? undefined : "Bei Mitarbeitenden und Gästen des Kunden ist meist der Kunde verantwortlich."}>
            <Select name="verantwortlich" value={effective} onChange={(e) => setVerantwortlich(e.target.value as "kunde" | "scm")}>
              <option value="kunde">Kunde (Auftraggeber)</option>
              <option value="scm">SCM</option>
            </Select>
          </Field>
        ) : (
          <div className="grid gap-1.5">
            <input type="hidden" name="verantwortlich" value="scm" />
            <span className="text-[13px] font-medium text-ink-2">Verantwortlich für die Veröffentlichung</span>
            <p className="rounded-[var(--radius-control)] bg-sunken px-3 py-2.5 text-[15px] text-ink">SCM, eigener Dreh ohne Auftraggeber</p>
            <FieldError name="verantwortlich" />
          </div>
        )}
        {issue && (
          <Hint tone="warn">
            {issue}{" "}
            {effective === "kunde" && clientEditHref ? (
              <Link href={clientEditHref} className="font-semibold underline underline-offset-2">
                Kunden bearbeiten
              </Link>
            ) : effective === "scm" ? (
              <Link href="/einstellungen?reiter=firma" className="font-semibold underline underline-offset-2">
                Firmendaten öffnen
              </Link>
            ) : null}
          </Hint>
        )}
      </Group>
      <Group title="Vorauswahl der Zwecke" hint="Die Person bestätigt oder ändert die Auswahl beim Unterschreiben selbst.">
        <CheckGroup
          key={String(hasClient)}
          name="zwecke"
          options={Object.fromEntries(zwecke.map((k) => [k, ZWECKE[k].label]))}
          selected={zweckeSelected.filter((z) => zwecke.includes(z))}
        />
      </Group>
    </div>
  );
}

export function EinwilligungForm({
  action,
  title,
  data,
  hasClient,
  issues,
  clientEditHref,
}: {
  action: Action;
  title: string;
  data: EinwilligungData;
  hasClient: boolean;
  issues?: ControllerIssues;
  clientEditHref?: string;
}) {
  return (
    <ActionForm action={action} className="grid gap-6">
      <TitleField value={title} />
      <EinwilligungFields data={data} hasClient={hasClient} issues={issues} clientEditHref={clientEditHref} />
      <DraftBar kind="einwilligung" />
    </ActionForm>
  );
}

// ------------------------------------------------------------------
export function DrehplanForm({ action, title, data, team }: { action: Action; title: string; data: DrehplanData; team: { id: number; name: string }[] }) {
  return (
    <ActionForm action={action} className="grid gap-6">
      <TitleField value={title} />
      {data.eventId ? <input type="hidden" name="eventId" value={data.eventId} /> : null}
      <Group title="Wann und wo">
        <FormGrid>
          <Field label="Drehtag" name="drehtag">
            <Input name="drehtag" type="date" defaultValue={data.drehtag} />
          </Field>
          <Field label="Ort" name="ort">
            <Input name="ort" defaultValue={data.ort} />
          </Field>
          <Field label="Beginn" name="start" optional>
            <Input name="start" type="time" defaultValue={data.start} />
          </Field>
          <Field label="Ende" name="ende" optional>
            <Input name="ende" type="time" defaultValue={data.ende} />
          </Field>
          <Field label="Treffpunkt" name="treffpunkt" optional>
            <Input name="treffpunkt" defaultValue={data.treffpunkt} />
          </Field>
        </FormGrid>
      </Group>
      <Group title="Menschen">
        <FormGrid>
          <Field label="Ansprechperson vor Ort" name="ansprechpartner" optional>
            <Input name="ansprechpartner" defaultValue={data.ansprechpartner} />
          </Field>
          <Field label="Telefon vor Ort" name="ansprechpartnerTelefon" optional>
            <Input name="ansprechpartnerTelefon" type="tel" defaultValue={data.ansprechpartnerTelefon} />
          </Field>
        </FormGrid>
        <ChoiceField label="Team" name="teamIds">
          <CheckGroup name="teamIds" options={Object.fromEntries(team.map((t) => [String(t.id), t.name]))} selected={(data.teamIds ?? []).map(String)} />
        </ChoiceField>
      </Group>
      <Group title="Ablauf" hint="Die Szenen kommen automatisch aus der Produktion: alle Videos des Kunden mit diesem Drehdatum samt Skript.">
        <Field label="Zeitplan" name="zeitplan" optional hint="Eine Zeile pro Punkt, z. B. 09:00 Aufbau">
          <Textarea name="zeitplan" defaultValue={data.zeitplan} rows={5} />
        </Field>
        <FormGrid>
          <Field label="Requisiten und Material" name="requisiten" optional hint="Eine Zeile pro Punkt">
            <Textarea name="requisiten" defaultValue={data.requisiten} rows={5} />
          </Field>
          <Field label="Checkliste" name="checkliste" optional hint="Eine Zeile pro Punkt">
            <Textarea name="checkliste" defaultValue={data.checkliste} rows={5} />
          </Field>
        </FormGrid>
        <Field label="Notizen" name="notizen" optional>
          <Textarea name="notizen" defaultValue={data.notizen} rows={3} />
        </Field>
      </Group>
      <DraftBar kind="drehplan" />
    </ActionForm>
  );
}

// ------------------------------------------------------------------
export function MonatsberichtForm({ action, title, data }: { action: Action; title: string; data: MonatsberichtData }) {
  return (
    <ActionForm action={action} className="grid gap-6">
      <TitleField value={title} />
      <Field label="Monat" name="month">
        <Input name="month" type="month" defaultValue={data.month} />
      </Field>
      <Field label="Das Wichtigste" name="highlights" optional hint="Zwei, drei Sätze an den Kunden: was lief gut, was habt ihr gelernt?">
        <Textarea name="highlights" defaultValue={data.highlights} rows={4} />
      </Field>
      <Field label="Ausblick" name="ausblick" optional hint="Was plant ihr für den nächsten Monat?">
        <Textarea name="ausblick" defaultValue={data.ausblick} rows={4} />
      </Field>
      <DraftBar kind="monatsbericht" />
    </ActionForm>
  );
}
