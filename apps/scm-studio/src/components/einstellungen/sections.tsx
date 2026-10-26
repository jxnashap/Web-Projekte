// Detailbereiche der Einstellungen (Server Components). Änderungen nur für Inhaber.
import { CheckCircle2, CircleSlash, Clock, FileCheck2, KeyRound, Lock, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { ActionForm, FieldError } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { Checkbox, Field, FormActions, FormGrid, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { TeamMember } from "@/db/schema";
import { LEGAL_TEMPLATE_VERSION } from "@/lib/dokumente/schema";
import { checkAuditChain, revokeLegalApproval, saveAi, saveCompany, saveLegalApproval, savePrivacy, setDemoMode } from "@/lib/einstellungen/actions";
import type { getSettingsOverview } from "@/lib/einstellungen/data";
import { nextNumber, SEQ_LABEL } from "@/lib/einstellungen/data";
import { AVV_PROVIDERS } from "@/lib/einstellungen/schema";
import { dateDe, dateTime } from "@/lib/format";
import { setTeamMemberActive, setTeamMemberRole, inviteTeamMember } from "@/lib/team/actions";
import { todayIso } from "@/lib/time";
import { AiForm } from "./ai-form";
import { Group, Row, StatusDot } from "./grouped";

type O = Awaited<ReturnType<typeof getSettingsOverview>>;

function Pane({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-6">
      <div>
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
        {intro && <p className="mt-1 max-w-2xl text-[14px] text-muted">{intro}</p>}
      </div>
      {children}
    </div>
  );
}

function AdminNote({ isAdmin }: { isAdmin: boolean }) {
  if (isAdmin) return null;
  return <p className="rounded-xl bg-fill-2 px-4 py-3 text-[14px] text-muted">Nur Inhaber können diese Angaben ändern.</p>;
}

// ------------------------------------------------------------------
export function FirmaPane({ o, isAdmin }: { o: O; isAdmin: boolean }) {
  const c = o.company;
  const missing = [!c?.iban && "IBAN", !c?.taxNumber && !c?.vatId && "Steuernummer oder USt-IdNr."].filter(Boolean);
  return (
    <Pane title="Firma" intro="Diese Angaben stehen auf Rechnungen, Verträgen und im Fuß jedes PDFs.">
      <AdminNote isAdmin={isAdmin} />
      {missing.length > 0 && (
        <p className="rounded-xl bg-warn-soft px-4 py-3 text-[14px] text-warn">Für Rechnungen fehlt noch: {missing.join(", ")}.</p>
      )}
      <Card className="p-5 sm:p-6">
        <ActionForm action={saveCompany} className="grid gap-6">
          <fieldset disabled={!isAdmin} className="grid gap-6">
            <FormGrid>
              <Field label="Marke" name="brand">
                <Input name="brand" defaultValue={c?.brand} />
              </Field>
              <Field label="Firmenname (rechtlich)" name="legalName">
                <Input name="legalName" defaultValue={c?.legalName} />
              </Field>
              <Field label="Inhaber" name="owner" optional>
                <Input name="owner" defaultValue={c?.owner} />
              </Field>
              <Field label="Straße und Hausnummer" name="street">
                <Input name="street" defaultValue={c?.street} autoComplete="street-address" />
              </Field>
              <Field label="PLZ" name="zip">
                <Input name="zip" defaultValue={c?.zip} inputMode="numeric" autoComplete="postal-code" />
              </Field>
              <Field label="Ort" name="city">
                <Input name="city" defaultValue={c?.city} autoComplete="address-level2" />
              </Field>
            </FormGrid>
            <FormGrid>
              <Field label="USt-IdNr." name="vatId" optional>
                <Input name="vatId" defaultValue={c?.vatId} placeholder="DE123456789" />
              </Field>
              <Field label="Steuernummer" name="taxNumber" optional>
                <Input name="taxNumber" defaultValue={c?.taxNumber} />
              </Field>
              <Field label="E-Mail" name="email" optional>
                <Input name="email" type="email" defaultValue={c?.email} />
              </Field>
              <Field label="Telefon" name="phone" optional>
                <Input name="phone" type="tel" defaultValue={c?.phone} />
              </Field>
              <Field label="Website" name="web" optional>
                <Input name="web" defaultValue={c?.web} />
              </Field>
            </FormGrid>
            <FormGrid>
              <Field label="Bank" name="bankName" optional>
                <Input name="bankName" defaultValue={c?.bankName} />
              </Field>
              <Field label="IBAN" name="iban" optional hint="Wird mit der Prüfziffer geprüft">
                <Input name="iban" defaultValue={c?.iban} placeholder="DE00 0000 0000 0000 0000 00" autoComplete="off" />
              </Field>
              <Field label="BIC" name="bic" optional>
                <Input name="bic" defaultValue={c?.bic} />
              </Field>
              <Field label="Zahlungsziel (Tage)" name="paymentDays">
                <Input name="paymentDays" type="number" min={0} max={90} defaultValue={c?.paymentDays ?? 14} />
              </Field>
            </FormGrid>
            <div className="grid gap-2 rounded-xl bg-fill-2 p-4">
              <Checkbox name="smallBusiness" label="Kleinunternehmer (§ 19 UStG)" defaultChecked={c?.smallBusiness} />
              <p className="text-[13px] text-muted">
                Möglich bei höchstens 25.000 € Umsatz im Vorjahr und höchstens 100.000 € im laufenden Jahr. Dann keine Umsatzsteuer auf Rechnungen und kein
                Vorsteuerabzug. Das Impressum nennt eine USt-IdNr.; ob SCM regelbesteuert ist, bitte mit der Steuerberatung klären.
              </p>
            </div>
          </fieldset>
          {isAdmin && (
            <FormActions className="mt-0">
              <SubmitButton>Speichern</SubmitButton>
            </FormActions>
          )}
        </ActionForm>
      </Card>
    </Pane>
  );
}

// ------------------------------------------------------------------
function Avatar({ m }: { m: TeamMember }) {
  return (
    <span className={`grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${m.active ? "bg-accent-soft text-accent-ink" : "bg-fill text-muted"}`} aria-hidden>
      {m.initials}
    </span>
  );
}

export function TeamPane({ o, isAdmin, meId }: { o: O; isAdmin: boolean; meId: number }) {
  return (
    <Pane
      title="Team"
      intro={
        o.authMode === "supabase"
          ? "Zugang nur per Einladung. Bei der ersten Anmeldung richtet jede Person die Zwei-Faktor-Anmeldung (TOTP) ein."
          : "In der Vorschau melden sich alle mit dem gemeinsamen Vorschau-Passwort an. Mit Supabase kommen Einladung per E-Mail und Zwei-Faktor dazu."
      }
    >
      <Group title={`${o.team.filter((t) => t.active).length} aktiv`}>
        {o.team.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Avatar m={m} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] text-ink">
                {m.name}
                {m.id === meId && <span className="text-muted"> (ihr)</span>}
              </span>
              <span className="block truncate text-[13px] text-muted">{m.email}</span>
            </span>
            <span className="flex items-center gap-2">
              <Badge tone={m.role === "admin" ? "info" : "neutral"}>{m.role === "admin" ? "Inhaber" : "Team"}</Badge>
              {!m.active && <Badge tone="neutral">Deaktiviert</Badge>}
              {o.authMode === "supabase" && <Badge tone={m.authUserId ? "ok" : "warn"}>{m.authUserId ? "angemeldet" : "eingeladen"}</Badge>}
            </span>
            {isAdmin && m.id !== meId && (
              <span className="flex w-full justify-end gap-1 sm:w-auto">
                <ActionButton action={setTeamMemberRole.bind(null, m.id, m.role === "admin" ? "team" : "admin")} variant="ghost" size="sm">
                  {m.role === "admin" ? "Zu Team" : "Zu Inhaber"}
                </ActionButton>
                <ActionButton
                  action={setTeamMemberActive.bind(null, m.id, !m.active)}
                  variant={m.active ? "danger" : "secondary"}
                  size="sm"
                  confirm={m.active ? `${m.name} deaktivieren? Die Person kann sich dann nicht mehr anmelden.` : undefined}
                >
                  {m.active ? "Deaktivieren" : "Aktivieren"}
                </ActionButton>
              </span>
            )}
          </li>
        ))}
      </Group>
      {isAdmin && (
        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold">
            <UserPlus className="size-4 text-accent" aria-hidden /> Person einladen
          </h3>
          <ActionForm action={inviteTeamMember} resetOnSuccess className="grid gap-4">
            <FormGrid>
              <Field label="Name" name="name">
                <Input name="name" autoComplete="off" />
              </Field>
              <Field label="E-Mail" name="email">
                <Input name="email" type="email" autoComplete="off" />
              </Field>
              <Field label="Rolle" name="role" hint="Inhaber dürfen Einstellungen, Festschreiben und Export">
                <Select name="role" defaultValue="team">
                  <option value="team">Team</option>
                  <option value="admin">Inhaber</option>
                </Select>
              </Field>
            </FormGrid>
            <FormActions className="mt-0">
              <SubmitButton>{o.authMode === "supabase" ? "Einladung senden" : "Anlegen"}</SubmitButton>
            </FormActions>
          </ActionForm>
        </Card>
      )}
    </Pane>
  );
}

// ------------------------------------------------------------------
export function NummernPane({ o }: { o: O }) {
  const kinds = ["rechnung", "angebot", "storno"];
  return (
    <Pane title="Nummernkreise" intro={`Nächste Nummern für ${o.year}. Sie werden erst beim Festschreiben vergeben, lückenlos und je Jahr neu.`}>
      <Group footer="Nummern lassen sich nicht von Hand ändern. So bleibt die Reihe lückenlos (GoBD). Ein Fehler wird per Storno korrigiert, nicht durch Löschen.">
        {kinds.map((k) => {
          const seq = o.sequences.find((s) => s.kind === k);
          return <Row key={k} label={SEQ_LABEL[k]} sub={seq ? `${seq.next - 1} vergeben` : "noch keine vergeben"} value={<span className="tabular-nums">{nextNumber(k, o.year, seq?.next ?? 1)}</span>} />;
        })}
      </Group>
    </Pane>
  );
}

// ------------------------------------------------------------------
export function AnbindungenPane({ o }: { o: O }) {
  const ready = o.integrations.filter((i) => i.ok).length;
  return (
    <Pane title="Anbindungen" intro={`${ready} von ${o.integrations.length} eingerichtet. Werte werden hier nie angezeigt, nur ob sie gesetzt sind.`}>
      <Group title="Anmeldung">
        <Row
          icon={o.authMode === "supabase" ? Lock : KeyRound}
          tone={o.authMode === "supabase" ? "green" : "orange"}
          label={o.authMode === "supabase" ? "Supabase Auth mit Zwei-Faktor" : "Vorschau-Zugang"}
          sub={o.authMode === "supabase" ? "E-Mail, Passwort und TOTP-App, nur eingeladene Personen" : "gemeinsames Vorschau-Passwort, nur für die lokale Vorschau"}
          value={o.authMode === "supabase" ? "aktiv" : "Vorschau"}
        />
      </Group>
      <Group
        title="Dienste"
        footer="Einrichtung Schritt für Schritt: EINRICHTUNG.md im Projektordner apps/scm-studio. Variablen im neuen Vercel-Projekt eintragen (nicht im MyImmo-Projekt)."
      >
        {o.integrations.map((i) => (
          <li key={i.key} className="grid gap-1 px-4 py-3">
            <span className="flex items-center gap-3">
              <span className="min-w-0 flex-1 text-[15px] text-ink">
                {i.label}
                {i.later && <span className="text-muted"> (später)</span>}
              </span>
              <StatusDot ok={i.ok} label={i.ok ? "eingerichtet" : "fehlt"} />
            </span>
            <span className="text-[13px] text-muted">{i.purpose}</span>
            {!i.ok && (
              <span className="flex flex-wrap gap-1.5 pt-1">
                {i.missing.map((v) => (
                  <code key={v} className="rounded-md bg-fill-2 px-1.5 py-0.5 font-mono text-[12px] text-ink-2">
                    {v}
                  </code>
                ))}
              </span>
            )}
          </li>
        ))}
      </Group>
    </Pane>
  );
}

// ------------------------------------------------------------------
export function KiPane({ o, isAdmin }: { o: O; isAdmin: boolean }) {
  const key = o.integrations.find((i) => i.key === "openai")?.ok;
  return (
    <Pane title="KI für Skripte" intro="Welches OpenAI-Modell die Skript-Entwürfe schreibt. Die Videos selbst produziert SCM ohne KI.">
      <AdminNote isAdmin={isAdmin} />
      <Group>
        <Row icon={Sparkles} tone={key ? "green" : "orange"} label="OpenAI-Schlüssel" value={key ? "eingerichtet" : "fehlt, Demo-Modus"} />
        <Row icon={Clock} tone="blue" label="Aufrufe diesen Monat" value={String(o.aiRunsMonth)} />
      </Group>
      <Card className="p-5 sm:p-6">
        <AiForm action={saveAi} value={o.ai} disabled={!isAdmin} />
      </Card>
      <p className="px-1 text-[12px] leading-relaxed text-muted">
        Preise und Modell-IDs laut Recherche vom 26.10.2026; vor dem Livegang auf der OpenAI-Preisseite und per Modellliste der API prüfen. Anfragen gehen mit store:false an
        OpenAI, ohne Namen oder andere Personendaten. OpenAI bewahrt Missbrauchsprotokolle bis zu 30 Tage auf.
      </p>
    </Pane>
  );
}

// ------------------------------------------------------------------
export function RechtPane({ o, isAdmin }: { o: O; isAdmin: boolean }) {
  const approved = o.legal && o.legal.approvedVersion === LEGAL_TEMPLATE_VERSION;
  return (
    <Pane
      title="Rechtliches"
      intro="Vertrag und Einwilligung sind Vorlagen aus der Recherche, keine Rechtsberatung. Bis eine Fachanwältin oder ein Fachanwalt die Fassung freigibt, tragen alle PDFs den Vermerk „Entwurf, anwaltlich zu prüfen“."
    >
      <Group>
        <Row label="Vorlagenfassung" value={LEGAL_TEMPLATE_VERSION} />
        <Row
          icon={approved ? FileCheck2 : CircleSlash}
          tone={approved ? "green" : "orange"}
          label="Anwaltliche Freigabe"
          sub={approved ? `${o.legal!.approvedBy}, ${dateDe(o.legal!.approvedAt)}` : o.legal ? `Freigabe gilt für ${o.legal.approvedVersion}, nicht für diese Fassung` : "noch nicht erfolgt"}
          value={approved ? "freigegeben" : "offen"}
        />
      </Group>
      {isAdmin && !approved && (
        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 text-[15px] font-semibold">Freigabe eintragen</h3>
          <ActionForm action={saveLegalApproval} className="grid gap-4">
            <FormGrid>
              <Field label="Geprüft von" name="approvedBy" hint="Kanzlei oder Name">
                <Input name="approvedBy" />
              </Field>
              <Field label="Datum der Freigabe" name="approvedAt">
                <Input name="approvedAt" type="date" max={todayIso()} defaultValue={todayIso()} />
              </Field>
            </FormGrid>
            <div className="grid gap-1.5">
              <Checkbox name="confirm" label={`Die Fassung ${LEGAL_TEMPLATE_VERSION} von Vertrag und Einwilligung wurde geprüft, alle Platzhalter sind geklärt.`} />
              <FieldError name="confirm" />
            </div>
            <FormActions className="mt-0">
              <SubmitButton>Freigabe speichern</SubmitButton>
            </FormActions>
          </ActionForm>
        </Card>
      )}
      {isAdmin && o.legal && (
        <div>
          <ActionButton action={revokeLegalApproval} variant="ghost" confirm="Freigabe entfernen? Neue PDFs tragen dann wieder den Entwurfsvermerk.">
            Freigabe entfernen
          </ActionButton>
        </div>
      )}
      <Group title="Offene Punkte für die Prüfung" footer="Diese Platzhalter stehen in eckigen Klammern im Vertrag oder in der Einwilligung.">
        {[
          "Übertrag oder Verfall nicht abgerufener Videos",
          "Frist und Folgen bei abgesagten Drehterminen",
          "Umgang mit veröffentlichten Videos nach einem Widerruf",
          "Aufbewahrungsfrist für Einwilligungsnachweise",
          "Kontakt für Datenschutzfragen",
          "Vertrag zur Auftragsverarbeitung als Anlage",
          "Ist SCM selbst Kaufmann? (nur dann ist ein Gerichtsstand vereinbar)",
        ].map((t) => (
          <Row key={t} label={t} />
        ))}
      </Group>
    </Pane>
  );
}

// ------------------------------------------------------------------
type AuditRow = { a: { id: number; at: Date; entity: string; entityId: number | null; action: string }; userName: string | null };

export function DatenschutzPane({ o, isAdmin, audit }: { o: O; isAdmin: boolean; audit: AuditRow[] }) {
  const avv = o.privacy.avv;
  return (
    <Pane title="Datenschutz und GoBD" intro="Löschfristen, Verträge zur Auftragsverarbeitung und das unveränderliche Änderungsprotokoll.">
      <Group title="Löschkonzept" footer="Fristen laut Recherche (§ 147 AO in der Fassung nach BEG IV). Die Frist beginnt mit Ende des Kalenderjahres. Gelöscht wird nie automatisch, sondern nach Prüfung.">
        <Row label="Anfragen ohne Auftrag" value="12 Monate" sub="nach dem letzten Kontakt" />
        <Row label="Rechnungen und Belege" value="8 Jahre" sub="§ 147 Abs. 3 AO, § 14b UStG" />
        <Row label="Bücher, Journale, Verfahrensdoku" value="10 Jahre" />
        <Row label="Angebote, Mahnungen, Geschäftsbriefe" value="6 Jahre" />
        <Row label="Einwilligungen" value="[PLATZHALTER]" sub="Nachweis, solange Aufnahmen genutzt werden" />
        <Row label="KI-Protokoll" value="nur Tokenzahlen" sub="keine Inhalte, keine Personendaten" />
      </Group>

      <Card className="p-5 sm:p-6">
        <h3 className="text-[15px] font-semibold">Verträge zur Auftragsverarbeitung</h3>
        <p className="mb-4 mt-1 text-[13px] text-muted">Datum eintragen, sobald der AV-Vertrag mit dem Dienst abgeschlossen ist.</p>
        <ActionForm action={savePrivacy} className="grid gap-4">
          <fieldset disabled={!isAdmin} className="grid gap-4 sm:grid-cols-2">
            {AVV_PROVIDERS.map((p) => (
              <Field key={p.key} label={p.label} name={p.key} optional hint={p.note}>
                <Input name={p.key} type="date" defaultValue={avv[p.key] ?? ""} max={todayIso()} />
              </Field>
            ))}
          </fieldset>
          {isAdmin && (
            <FormActions className="mt-0">
              <SubmitButton>Speichern</SubmitButton>
            </FormActions>
          )}
        </ActionForm>
      </Card>

      <Group title="Schutzmaßnahmen">
        <Row icon={ShieldCheck} tone="green" label="Zwei-Faktor-Anmeldung" value={o.authMode === "supabase" ? "Pflicht" : "mit Supabase"} />
        <Row icon={Lock} tone="green" label="Zugänge zu Google und Instagram" value="verschlüsselt" sub="AES-256-GCM" />
        <Row icon={Lock} tone="green" label="Tabellen nicht öffentlich" value="RLS an" sub="eigenes Schema, nur Server-Zugriff" />
        <Row icon={FileCheck2} tone="green" label="Festgeschriebene Belege" value="unveränderlich" sub="Datenbank-Trigger, Storno statt Löschen" />
      </Group>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-2 pt-4">
          <div>
            <h3 className="text-[15px] font-semibold">Änderungsprotokoll</h3>
            <p className="text-[13px] text-muted">Jeder Eintrag enthält den Prüfwert des vorherigen. Nachträgliche Änderungen fallen auf.</p>
          </div>
          {isAdmin && (
            <ActionButton action={checkAuditChain} variant="secondary">
              <CheckCircle2 className="size-4" /> Protokoll prüfen
            </ActionButton>
          )}
        </div>
        <ul className="divide-y divide-hairline">
          {audit.map(({ a, userName }) => (
            <li key={a.id} className="flex items-center gap-3 px-5 py-2.5 text-[13px]">
              <span className="w-12 shrink-0 tabular-nums text-faint">#{a.id}</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="text-ink">{a.entity}</span>
                {a.entityId ? <span className="text-muted"> {a.entityId}</span> : null}
                <span className="text-muted"> · {a.action.replace(/_/g, " ")}</span>
              </span>
              <span className="hidden shrink-0 text-muted sm:block">{userName ?? "System"}</span>
              <span className="shrink-0 tabular-nums text-muted">{dateTime(a.at)}</span>
            </li>
          ))}
          {audit.length === 0 && <li className="px-5 py-4 text-[13px] text-muted">Noch keine Einträge.</li>}
        </ul>
      </Card>
    </Pane>
  );
}

// ------------------------------------------------------------------
export function PortalPane() {
  return (
    <Pane title="Kundenportal" intro="Kommt später. Vorgemerkt, damit Kunden selbst mitarbeiten können, ohne E-Mail-Pingpong.">
      <Group title="Ideen für das Portal">
        {[
          ["Freigabelinks für Videos", "Kunde sieht den Schnitt, gibt frei oder kommentiert"],
          ["Monatsberichte", "jederzeit abrufbar statt als Anhang"],
          ["Rechnungen und Verträge", "alles an einem Ort, mit Download"],
          ["Einwilligungen vorab", "Mitarbeitende unterschreiben schon vor dem Drehtag digital"],
          ["Material hochladen", "Logos, Preise, Angebote direkt von Kundenseite"],
        ].map(([t, s]) => (
          <Row key={t} label={t} sub={s} />
        ))}
      </Group>
    </Pane>
  );
}

export function DemoPane({ o, isAdmin }: { o: O; isAdmin: boolean }) {
  return (
    <Pane title="Demo-Daten" intro="In der Vorschau sind Kunden und Reels echt, Pakete, Preise, Aufrufe und Finanzzahlen sind Beispielwerte.">
      <Group footer="Vor dem echten Start: Demo-Hinweise ausschalten und die Datenbank in Supabase ohne Demo-Daten anlegen.">
        <Row label="Demo-Hinweise" value={o.demo ? "an" : "aus"} sub="Banner in der App, Vermerk in Berichten und PDFs" />
      </Group>
      {isAdmin && (
        <div>
          <ActionButton action={setDemoMode.bind(null, !o.demo)} variant="secondary">
            {o.demo ? "Demo-Hinweise ausschalten" : "Demo-Hinweise einschalten"}
          </ActionButton>
        </div>
      )}
    </Pane>
  );
}
