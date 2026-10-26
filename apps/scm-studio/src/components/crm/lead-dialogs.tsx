"use client";
// Abschluss einer Anfrage: "Zum Kunden machen" (Gewonnen) und "Als verloren markieren" (mit Grund).
// Ein Provider hält beide Dialoge, damit Board, Liste und Detailseite denselben Ablauf nutzen:
// Gewonnen entsteht nie ohne Kunde, Verloren nie ohne Grund.
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormActions, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { convertLead, markLeadLost } from "@/lib/crm/actions";
import { ChoiceGroup } from "./choice-group";

export type LeadRef = { id: number; company: string; branche: string | null; packageInterest: string | null; stage: string };

type Api = { convert: (lead: LeadRef) => void; lost: (lead: LeadRef) => void };
const Ctx = createContext<Api | null>(null);

export function useLeadDialogs(): Api {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLeadDialogs braucht einen LeadDialogsProvider");
  return ctx;
}

export function LeadDialogsProvider({ children, branchen }: { children: React.ReactNode; branchen: Record<string, string> }) {
  const [open, setOpen] = useState<{ kind: "convert" | "lost"; lead: LeadRef } | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const api = useMemo<Api>(() => ({ convert: (lead) => setOpen({ kind: "convert", lead }), lost: (lead) => setOpen({ kind: "lost", lead }) }), []);
  return (
    <Ctx.Provider value={api}>
      {children}
      <Dialog
        open={open?.kind === "convert"}
        onClose={close}
        title="Zum Kunden machen"
        description="Legt einen Kunden mit den Kontaktdaten an und setzt die Anfrage auf „Gewonnen“."
      >
        {open?.kind === "convert" && <ConvertForm key={open.lead.id} lead={open.lead} branchen={branchen} />}
      </Dialog>
      <Dialog open={open?.kind === "lost"} onClose={close} title="Als verloren markieren" description="Der Grund hilft später beim Nachfassen.">
        {open?.kind === "lost" && <LostForm key={open.lead.id} lead={open.lead} />}
      </Dialog>
    </Ctx.Provider>
  );
}

function ConvertForm({ lead, branchen }: { lead: LeadRef; branchen: Record<string, string> }) {
  const [status, setStatus] = useState(lead.stage === "testvideos" ? "test" : "aktiv");
  const suggested = lead.packageInterest && lead.packageInterest !== "unsicher" ? lead.packageInterest : "";
  const branche = lead.branche && lead.branche in branchen ? lead.branche : "";
  return (
    <ActionForm action={convertLead.bind(null, lead.id)}>
      <div className="grid gap-4">
        <Field label="Kundenname" name="name" hint="So, wie er auf Rechnungen stehen soll">
          <Input name="name" defaultValue={lead.company} required autoComplete="organization" />
        </Field>
        <Field label="Branche" name="branche">
          <Select name="branche" defaultValue={branche} required>
            <option value="" disabled>
              Bitte wählen
            </option>
            {Object.entries(branchen).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <ChoiceGroup
          name="status"
          legend="Start mit"
          value={status}
          onChange={setStatus}
          options={[
            { value: "test", label: "Testvideos" },
            { value: "aktiv", label: "Paket" },
          ]}
        />
        {status === "aktiv" ? (
          <Field label="Videos pro Monat" name="packageVideos" optional hint="Preis und Vertragsdaten ergänzt ihr danach beim Kunden.">
            <Select name="packageVideos" defaultValue={suggested}>
              <option value="">Noch offen</option>
              <option value="4">4 Videos</option>
              <option value="8">8 Videos</option>
              <option value="12">12 Videos</option>
            </Select>
          </Field>
        ) : (
          <p className="text-[13px] text-muted">Testkunden bekommen noch kein Paket und kein Kontingent. Das Paket tragt ihr ein, wenn sie zusagen.</p>
        )}
      </div>
      <FormActions>
        <SubmitButton pendingText="Legt an …">Kunde anlegen</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

function LostForm({ lead }: { lead: LeadRef }) {
  return (
    <ActionForm action={markLeadLost.bind(null, lead.id)}>
      <Field label="Grund" name="lostReason">
        <Textarea name="lostReason" rows={3} placeholder="z. B. Budget, Saison vorbei, macht es selbst" required />
      </Field>
      <FormActions>
        <SubmitButton>Als verloren markieren</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
