// Felder einer Anfrage (Anlegen im Dialog und Bearbeiten auf der Detailseite).
import type { Lead } from "@/db/schema";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { CONTACT_WAYS, LEAD_SCORE, LEAD_SOURCES, LEAD_STAGES } from "@/lib/labels";
import { LEAD_BRANCHEN, PACKAGE_INTEREST, START_WISH } from "@/lib/crm/labels";

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

export function LeadFields({ lead, showStage = false, today }: { lead?: Lead | null; showStage?: boolean; today?: string }) {
  const l = lead ?? null;
  return (
    <div className="grid gap-6">
      <fieldset className="grid gap-4">
        <legend className="scene-label mb-3">Wer</legend>
        <FormGrid>
          <Field label="Betrieb" name="company">
            <Input name="company" defaultValue={l?.company ?? ""} required autoComplete="organization" placeholder="z. B. Café Hafenblick" autoFocus={showStage} />
          </Field>
          <Field label="Ansprechpartner" name="name">
            <Input name="name" defaultValue={l?.name ?? ""} required autoComplete="name" placeholder="Vor- und Nachname" />
          </Field>
          <Field label="Branche" name="branche" optional>
            <Select name="branche" defaultValue={l?.branche ?? ""}>
              <Options map={LEAD_BRANCHEN} empty="Bitte wählen" />
            </Select>
          </Field>
          <Field label="Ort" name="ort" optional>
            <Input name="ort" defaultValue={l?.ort ?? ""} placeholder="z. B. Kiel" />
          </Field>
        </FormGrid>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="scene-label mb-3">Kontakt</legend>
        <FormGrid>
          <Field label="Telefon oder WhatsApp" name="phone" optional>
            <Input name="phone" type="tel" inputMode="tel" defaultValue={l?.phone ?? ""} autoComplete="tel" placeholder="0431 …" />
          </Field>
          <Field label="E-Mail" name="email" optional>
            <Input name="email" type="email" inputMode="email" defaultValue={l?.email ?? ""} autoComplete="email" />
          </Field>
          <Field label="Gewünschter Kontaktweg" name="contactWay" optional>
            <Select name="contactWay" defaultValue={l?.contactWay ?? ""}>
              <Options map={CONTACT_WAYS} empty="Egal" />
            </Select>
          </Field>
          <Field label="Quelle" name="source">
            <Select name="source" defaultValue={l?.source ?? "sonstiges"}>
              <Options map={LEAD_SOURCES} />
            </Select>
          </Field>
        </FormGrid>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="scene-label mb-3">Interesse</legend>
        <FormGrid className="lg:grid-cols-3">
          <Field label="Paket" name="packageInterest" optional>
            <Select name="packageInterest" defaultValue={l?.packageInterest ?? ""}>
              <Options map={PACKAGE_INTEREST} empty="Unbekannt" />
            </Select>
          </Field>
          <Field label="Start" name="startWish" optional>
            <Select name="startWish" defaultValue={l?.startWish ?? ""}>
              <Options map={START_WISH} empty="Unbekannt" />
            </Select>
          </Field>
          <Field label="Bewertung" name="score" hint="Automatisch: aus Paket und Start wie im Website-Quiz">
            <Select name="score" defaultValue={l?.score ?? "auto"}>
              <option value="auto">Automatisch</option>
              {Object.keys(LEAD_SCORE).map((k) => (
                <option key={k} value={k}>
                  {k}: {LEAD_SCORE[k].hint}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="scene-label mb-3">Wie geht es weiter</legend>
        <FormGrid className={showStage ? "lg:grid-cols-3" : undefined}>
          {showStage && (
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
          <Field label="Nächster Schritt" name="nextStep" optional>
            <Input name="nextStep" defaultValue={l?.nextStep ?? ""} placeholder="z. B. Zurückrufen, Testvideos planen" />
          </Field>
          <Field label="Bis wann" name="nextStepAt" optional>
            <Input name="nextStepAt" type="date" defaultValue={l?.nextStepAt ?? today ?? ""} />
          </Field>
        </FormGrid>
        <Field label="Nachricht der Anfrage" name="message" optional>
          <Textarea name="message" defaultValue={l?.message ?? ""} rows={2} placeholder="Was hat der Betrieb geschrieben?" />
        </Field>
        <Field label="Interne Notizen" name="notes" optional>
          <Textarea name="notes" defaultValue={l?.notes ?? ""} rows={3} />
        </Field>
      </fieldset>
    </div>
  );
}
