"use client";
// Felder einer Anfrage. compact (Schnell-Anlegen im Dialog): nur Betrieb, Ansprechpartner, Kontakt, Quelle und
// nächster Schritt sichtbar, der Rest hinter "Mehr Angaben". Auf der Detailseite sind alle Felder offen.
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { Lead } from "@/db/schema";
import { useFormCtx } from "@/components/ui/action-form";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { isAutoScore, LEAD_BRANCHEN, PACKAGE_INTEREST, scoreFor, START_WISH } from "@/lib/crm/labels";
import { CONTACT_WAYS, LEAD_SCORE, LEAD_SOURCES, LEAD_STAGES } from "@/lib/labels";
import { ChoiceGroup } from "./choice-group";

function Options({ map, empty }: { map: Record<string, string>; empty?: string }) {
  return (
    <>
      {empty !== undefined && <option value="">{empty}</option>}
      {Object.entries(map).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </>
  );
}

// Beim Schnell-Anlegen kommen Website-Anfragen nicht vor (die laufen automatisch ein)
const QUICK_SOURCES = ["telefon", "instagram", "empfehlung", "sonstiges"];
const MORE_FIELDS = ["branche", "ort", "contactWay", "packageInterest", "startWish", "score", "stage", "message", "notes"];

export function LeadFields({ lead, compact = false, today }: { lead?: Lead | null; compact?: boolean; today?: string }) {
  const l = lead ?? null;
  const { state } = useFormCtx();
  const [step, setStep] = useState(l?.nextStep ?? "");
  const [stepAt, setStepAt] = useState(l?.nextStepAt ?? "");
  const [pkg, setPkg] = useState(l?.packageInterest ?? "");
  const [start, setStart] = useState(l?.startWish ?? "");
  const autoScore = !l || isAutoScore(l.score, l.packageInterest, l.startWish);
  const autoLabel = pkg || start ? `Automatisch (${scoreFor(pkg, start)})` : "Automatisch";
  // "Mehr Angaben" öffnen, falls dort ein Fehler steht
  const moreHasError = MORE_FIELDS.some((k) => state.fieldErrors?.[k]?.length);

  const who = (
    <FormGrid>
      <Field label="Betrieb" name="company">
        <Input name="company" defaultValue={l?.company ?? ""} required autoComplete="organization" placeholder="z. B. Café Hafenblick" />
      </Field>
      <Field label="Ansprechpartner" name="name" optional hint={compact ? "Leer lassen, wenn unbekannt" : undefined}>
        <Input name="name" defaultValue={l && l.name !== l.company ? l.name : ""} autoComplete="name" placeholder="Vor- und Nachname" />
      </Field>
      <Field label="Telefon oder WhatsApp" name="phone" optional>
        <Input name="phone" type="tel" inputMode="tel" defaultValue={l?.phone ?? ""} autoComplete="tel" placeholder="0431 …" />
      </Field>
      <Field label="E-Mail" name="email" optional>
        <Input name="email" type="email" inputMode="email" defaultValue={l?.email ?? ""} autoComplete="email" />
      </Field>
    </FormGrid>
  );

  const source = compact ? (
    <ChoiceGroup
      name="source"
      legend="Quelle"
      defaultValue="telefon"
      options={QUICK_SOURCES.map((k) => ({ value: k, label: LEAD_SOURCES[k] }))}
    />
  ) : (
    <Field label="Quelle" name="source">
      <Select name="source" defaultValue={l?.source ?? "telefon"}>
        <Options map={LEAD_SOURCES} />
      </Select>
    </Field>
  );

  const next = (
    <FormGrid>
      <Field label="Nächster Schritt" name="nextStep" optional>
        <Input
          name="nextStep"
          value={step}
          onChange={(e) => {
            setStep(e.target.value);
            // Datum erst vorschlagen, wenn es einen Schritt gibt
            if (e.target.value.trim() && !stepAt && today) setStepAt(today);
          }}
          placeholder="z. B. Zurückrufen, Testvideos planen"
        />
      </Field>
      <Field label="Bis wann" name="nextStepAt" optional>
        <Input name="nextStepAt" type="date" value={stepAt} onChange={(e) => setStepAt(e.target.value)} />
      </Field>
    </FormGrid>
  );

  const details = (
    <>
      <FormGrid>
        <Field label="Branche" name="branche" optional>
          <Select name="branche" defaultValue={l?.branche ?? ""}>
            <Options map={LEAD_BRANCHEN} empty="Noch nicht bekannt" />
          </Select>
        </Field>
        <Field label="Ort" name="ort" optional>
          <Input name="ort" defaultValue={l?.ort ?? ""} placeholder="z. B. Kiel" />
        </Field>
        <Field label="Gewünschter Kontaktweg" name="contactWay" optional>
          <Select name="contactWay" defaultValue={l?.contactWay ?? ""}>
            <Options map={CONTACT_WAYS} empty="Egal" />
          </Select>
        </Field>
        {compact && (
          <Field label="Stufe" name="stage">
            <Select name="stage" defaultValue="neu">
              {LEAD_STAGES.filter((s) => s.key !== "gewonnen" && s.key !== "verloren").map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </FormGrid>
      <FormGrid className="lg:grid-cols-3">
        <Field label="Paket" name="packageInterest" optional>
          <Select name="packageInterest" value={pkg} onChange={(e) => setPkg(e.target.value)}>
            <Options map={PACKAGE_INTEREST} empty="Unbekannt" />
          </Select>
        </Field>
        <Field label="Start" name="startWish" optional>
          <Select name="startWish" value={start} onChange={(e) => setStart(e.target.value)}>
            <Options map={START_WISH} empty="Unbekannt" />
          </Select>
        </Field>
        <Field label="Bewertung" name="score" hint="Automatisch: aus Paket und Start wie im Website-Quiz">
          <Select name="score" defaultValue={autoScore ? "auto" : (l?.score ?? "auto")}>
            <option value="auto">{autoLabel}</option>
            {Object.keys(LEAD_SCORE).map((k) => (
              <option key={k} value={k}>
                {k}: {LEAD_SCORE[k].hint}
              </option>
            ))}
          </Select>
        </Field>
      </FormGrid>
      <Field label="Nachricht der Anfrage" name="message" optional>
        <Textarea name="message" defaultValue={l?.message ?? ""} rows={2} placeholder="Was hat der Betrieb geschrieben?" />
      </Field>
      <Field label="Interne Notizen" name="notes" optional>
        <Textarea name="notes" defaultValue={l?.notes ?? ""} rows={3} />
      </Field>
    </>
  );

  if (compact)
    return (
      <div className="grid gap-5">
        {who}
        {source}
        {next}
        <details className="group" open={moreHasError || undefined}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
            <ChevronDown className="size-4 -rotate-90 text-muted transition-transform group-open:rotate-0" aria-hidden />
            Mehr Angaben
            <span className="text-[13px] font-normal text-muted">Branche, Ort, Interesse, Nachricht</span>
          </summary>
          <div className="mt-3 grid gap-4">{details}</div>
        </details>
      </div>
    );

  return (
    <div className="grid gap-7">
      <fieldset className="grid gap-4">
        <legend className="mb-3 text-[13px] font-semibold text-muted">Wer und wie erreichbar</legend>
        {who}
        <FormGrid>{source}</FormGrid>
      </fieldset>
      <fieldset className="grid gap-4">
        <legend className="mb-3 text-[13px] font-semibold text-muted">Planung</legend>
        {next}
      </fieldset>
      <fieldset className="grid gap-4">
        <legend className="mb-3 text-[13px] font-semibold text-muted">Betrieb und Interesse</legend>
        {details}
      </fieldset>
    </div>
  );
}
