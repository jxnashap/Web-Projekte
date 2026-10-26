// Detailbereiche der Einstellungen (Server Components). Änderungen nur für Inhaber.
import { CheckCircle2, CircleSlash, Clock, FileCheck2, FlaskConical, KeyRound, Lock, ShieldCheck, Sparkles, Tag } from "lucide-react";
import Link from "next/link";
import { ActionForm, FieldError } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { Checkbox, Field, FormActions, FormGrid, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { TeamMember } from "@/db/schema";
import { LEGAL_TEMPLATE_VERSION } from "@/lib/dokumente/schema";
import {
  addBranche,
  checkAuditChain,
  removeBranche,
  revokeLegalApproval,
  saveAi,
  saveCompany,
  saveLegalApproval,
  savePrivacy,
  saveReferenzen,
  setDemoMode,
} from "@/lib/einstellungen/actions";
import type { getSettingsOverview } from "@/lib/einstellungen/data";
import { nextNumber, SEQ_LABEL } from "@/lib/einstellungen/data";
import { AVV_PROVIDERS } from "@/lib/einstellungen/schema";
import { dateDe, dateTime } from "@/lib/format";
import { createAccessLink, inviteTeamMember, setTeamMemberActive, setTeamMemberRole } from "@/lib/team/actions";
import { todayIso } from "@/lib/time";
import { AiForm } from "./ai-form";
import { AUDIT_ENTITY, auditAction, auditHref } from "./audit-labels";
import { DemoSwitch } from "./demo-switch";
import { Group, Row, RowIcon, StatusDot } from "./grouped";
import { TeamInviteCard } from "./team-invite";
import { TeamMemberRow } from "./team-member";

type O = Awaited<ReturnType<typeof getSettingsOverview>>;

/**
 * Bereich mit Titel. Auf dem Handy ist der Bereich eine eigene Seite: Titel groß als h1 (die Seitenüberschrift
 * "Einstellungen" ist dort ausgeblendet). Am Computer steht er neben der Liste als h2.
 */
function Pane({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-6">
      <div>
        <h1 className="display text-[32px] text-ink lg:hidden">{title}</h1>
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink max-lg:hidden">{title}</h2>
        {intro && <p className="mt-1.5 max-w-2xl text-[15px] leading-snug text-muted">{intro}</p>}
      </div>
      {children}
    </div>
  );
}

/** Karte mit Überschrift für einen Abschnitt eines Formulars */
function FormCard({ title, sub, children }: { title: string; sub?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} sub={sub} />
      <div className="px-5 pb-5 pt-1">{children}</div>
    </Card>
  );
}

const ibanGroups = (iban?: string | null) => (iban ? iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim() : "");

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
      <ActionForm action={saveCompany} className="grid gap-5">
        <fieldset disabled={!isAdmin} className="grid gap-5">
          <FormCard title="Name und Anschrift">
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
          </FormCard>
          <FormCard title="Kontakt" sub="Die E-Mail ist auch der Kontakt für Datenschutzfragen in Einwilligungen, bei denen SCM verantwortlich ist.">
            <FormGrid>
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
          </FormCard>
          <FormCard title="Steuern">
            <div className="grid gap-4">
              <FormGrid>
                <Field label="USt-IdNr." name="vatId" optional>
                  <Input name="vatId" defaultValue={c?.vatId} placeholder="DE123456789" />
                </Field>
                <Field label="Steuernummer" name="taxNumber" optional>
                  <Input name="taxNumber" defaultValue={c?.taxNumber} />
                </Field>
              </FormGrid>
              <div className="grid gap-1 rounded-xl bg-fill-2 px-4 py-3">
                <Checkbox name="smallBusiness" label="Kleinunternehmer (§ 19 UStG)" defaultChecked={c?.smallBusiness} />
                <p className="text-[13px] text-muted">
                  Möglich bei höchstens 25.000 € Umsatz im Vorjahr und höchstens 100.000 € im laufenden Jahr. Dann keine Umsatzsteuer auf Rechnungen und kein
                  Vorsteuerabzug. Das Impressum nennt eine USt-IdNr.; ob SCM regelbesteuert ist, bitte mit der Steuerberatung klären.
                </p>
              </div>
            </div>
          </FormCard>
          <FormCard title="Bank und Zahlung">
            <FormGrid>
              <Field label="Bank" name="bankName" optional>
                <Input name="bankName" defaultValue={c?.bankName} />
              </Field>
              <Field label="IBAN" name="iban" optional hint="Wird mit der Prüfziffer geprüft">
                <Input name="iban" defaultValue={ibanGroups(c?.iban)} placeholder="DE00 0000 0000 0000 0000 00" autoComplete="off" className="tabular-nums" />
              </Field>
              <Field label="BIC" name="bic" optional>
                <Input name="bic" defaultValue={c?.bic} />
              </Field>
              <Field label="Zahlungsziel (Tage)" name="paymentDays">
                <Input name="paymentDays" type="number" min={0} max={90} defaultValue={c?.paymentDays ?? 14} />
              </Field>
            </FormGrid>
          </FormCard>
        </fieldset>
        {isAdmin && (
          <FormActions className="mt-0">
            <SubmitButton>Speichern</SubmitButton>
          </FormActions>
        )}
      </ActionForm>
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

function MemberInfo({ m, me, authMode }: { m: TeamMember; me: boolean; authMode: string }) {
  return (
    <>
      <Avatar m={m} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-ink">
          {m.name}
          {me && <span className="text-muted"> (angemeldet)</span>}
        </span>
        <span className="block truncate text-[13px] text-muted">{m.email}</span>
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        <Badge tone={m.role === "admin" ? "info" : "neutral"}>{m.role === "admin" ? "Inhaber" : "Team"}</Badge>
        {!m.active && <Badge tone="neutral">Gesperrt</Badge>}
        {authMode === "supabase" && <Badge tone={m.authUserId ? "ok" : "warn"}>{m.authUserId ? "Zugang eingerichtet" : "eingeladen"}</Badge>}
      </span>
    </>
  );
}

export function TeamPane({ o, isAdmin, meId }: { o: O; isAdmin: boolean; meId: number }) {
  return (
    <Pane
      title="Team"
      intro={
        o.authMode === "supabase"
          ? "Zugang nur per Einladung: Ihr schickt jeder Person einen Zugangslink. Bei der ersten Anmeldung richtet sie ein Passwort und die Zwei-Faktor-Anmeldung (TOTP) ein."
          : "In der Vorschau melden sich alle mit dem gemeinsamen Vorschau-Passwort an. Mit Supabase kommen Zugangslinks und Zwei-Faktor dazu."
      }
    >
      <Group
        title={`${o.team.filter((t) => t.active).length} aktiv`}
        footer={
          <>
            {isAdmin && "Person antippen, um die Rolle zu ändern oder den Zugang zu sperren. "}
            {o.demo && "In der Vorschau sind die E-Mail-Adressen Platzhalter, bis das Team sie bestätigt."}
          </>
        }
      >
        {o.team.map((m) =>
          isAdmin && m.id !== meId ? (
            <TeamMemberRow
              key={m.id}
              name={m.name}
              email={m.email}
              role={m.role}
              active={m.active}
              makeTeam={setTeamMemberRole.bind(null, m.id, "team")}
              makeAdmin={setTeamMemberRole.bind(null, m.id, "admin")}
              toggleActive={setTeamMemberActive.bind(null, m.id, !m.active)}
              accessLink={o.authMode === "supabase" ? createAccessLink.bind(null, m.id) : undefined}
            >
              <MemberInfo m={m} me={false} authMode={o.authMode} />
            </TeamMemberRow>
          ) : (
            <li key={m.id} className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-3">
              <MemberInfo m={m} me={m.id === meId} authMode={o.authMode} />
            </li>
          ),
        )}
      </Group>
      {isAdmin && <TeamInviteCard supabase={o.authMode === "supabase"} action={inviteTeamMember} />}
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
  const missing = o.integrations.filter((i) => !i.ok);
  return (
    <Pane title="Anbindungen" intro={`${ready} von ${o.integrations.length} eingerichtet. Zugangsdaten werden hier nie angezeigt, nur ob sie gesetzt sind.`}>
      <Group title="Anmeldung">
        <Row
          icon={o.authMode === "supabase" ? Lock : KeyRound}
          tone={o.authMode === "supabase" ? "green" : "orange"}
          label={o.authMode === "supabase" ? "Supabase Auth mit Zwei-Faktor" : "Vorschau-Zugang"}
          sub={o.authMode === "supabase" ? "E-Mail, Passwort und Zwei-Faktor-App, nur eingeladene Personen" : "gemeinsames Vorschau-Passwort, nur für die lokale Vorschau"}
          value={o.authMode === "supabase" ? "aktiv" : "Vorschau"}
        />
      </Group>
      <Group title="Dienste">
        {o.integrations.map((i) => (
          <li key={i.key} className="grid gap-0.5 px-4 py-3">
            <span className="flex items-center gap-3">
              <span className="min-w-0 flex-1 text-[15px] text-ink">
                {i.label}
                {i.later && <span className="text-muted"> (später)</span>}
              </span>
              <StatusDot ok={i.ok} label={i.ok ? "eingerichtet" : "fehlt"} />
            </span>
            <span className="text-[13px] text-muted">{i.purpose}</span>
          </li>
        ))}
      </Group>
      {missing.length > 0 && (
        <details className="group rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-card)] px-4 py-3 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
            Für die Einrichtung
            <span className="text-[13px] font-normal text-muted group-open:hidden">fehlende Umgebungsvariablen zeigen</span>
          </summary>
          <div className="grid gap-3 border-t border-hairline px-4 py-4 text-[13px] text-muted">
            <p>
              Schritt für Schritt in EINRICHTUNG.md im Projektordner apps/scm-studio. Die Werte gehören in ein eigenes, neues Vercel-Projekt (nicht in das MyImmo-Projekt).
            </p>
            <ul className="grid gap-2">
              {missing.map((i) => (
                <li key={i.key} className="grid gap-1">
                  <span className="text-ink">{i.label}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {i.missing.map((v) => (
                      <code key={v} className="rounded-md bg-fill-2 px-1.5 py-0.5 text-[12px] text-ink-2">
                        {v}
                      </code>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </Pane>
  );
}

// ------------------------------------------------------------------
export function BranchenPane({ o, isAdmin }: { o: O; isAdmin: boolean }) {
  const kunden = (n: number) => (n === 0 ? "noch kein Kunde" : n === 1 ? "1 Kunde" : `${n} Kunden`);
  return (
    <Pane
      title="Branchen"
      intro="Die Auswahl bei Kunden und Anfragen. Die Creative Engine und die Trend-Recherche nutzen sie als Rahmen für Ideen. Die vier festen kommen aus dem Website-Quiz."
    >
      <AdminNote isAdmin={isAdmin} />
      <Group title="Fest">
        {o.branchen.fixed.map((b) => (
          <Row key={b.key} icon={Tag} tone="gray" label={b.label} value={kunden(b.clients)} />
        ))}
      </Group>
      <Card>
        <CardHeader title="Eigene Branchen" sub={o.branchen.custom.length ? undefined : "Noch keine. Zum Beispiel Fahrschule, Fitnessstudio oder Friseur."} />
        <div className="grid gap-4 px-5 pb-5 pt-1">
          {o.branchen.custom.length > 0 && (
            <ul className="divide-y divide-hairline rounded-[14px] bg-sunken">
              {o.branchen.custom.map((b) => (
                <li key={b.key} className="flex min-h-12 items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{b.label}</span>
                    <span className="block text-[13px] text-muted">{kunden(b.clients)}</span>
                  </span>
                  {isAdmin && b.clients === 0 && (
                    <ActionButton action={removeBranche.bind(null, b.key)} variant="ghost" confirm={{ title: `„${b.label}“ entfernen?`, confirmLabel: "Entfernen", tone: "danger" }}>
                      Entfernen
                    </ActionButton>
                  )}
                </li>
              ))}
            </ul>
          )}
          {isAdmin && (
            <ActionForm action={addBranche} resetOnSuccess className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label="Neue Branche" name="name" className="min-w-0 flex-1">
                <Input name="name" placeholder="z. B. Fahrschule" maxLength={40} autoComplete="off" required />
              </Field>
              <SubmitButton variant="secondary">Hinzufügen</SubmitButton>
            </ActionForm>
          )}
        </div>
      </Card>
    </Pane>
  );
}

// ------------------------------------------------------------------
export function KiPane({ o, isAdmin }: { o: O; isAdmin: boolean }) {
  const key = o.integrations.find((i) => i.key === "openai")?.ok;
  return (
    <Pane title="KI für Skripte" intro="Welches OpenAI-Modell die Creative Engine nutzt und woran sie sich orientiert. Die Videos selbst produziert SCM ohne KI.">
      <AdminNote isAdmin={isAdmin} />
      <Group>
        <Row icon={Sparkles} tone={key ? "green" : "orange"} label="OpenAI-Zugang" value={key ? "eingerichtet" : "fehlt, Beispieltexte"} />
        <Row icon={Clock} tone="blue" label="Aufrufe diesen Monat" value={String(o.aiRunsMonth)} />
      </Group>
      <Card>
        <CardHeader title="Modell" />
        <div className="px-5 pb-5 pt-1">
          <AiForm action={saveAi} value={o.ai} disabled={!isAdmin} />
        </div>
      </Card>
      <Card>
        <CardHeader
          title="Referenz-Skripte"
          sub="Eure besten echten Skripte als Maßstab für Humor, Tempo und Originalität. Die Creative Engine orientiert sich daran, kopiert aber nicht. Rollen statt Namen."
        />
        <div className="px-5 pb-5 pt-1">
          <ActionForm action={saveReferenzen} className="grid gap-3">
            <Field label="Skripte, eins je Absatz" name="referenzen" hint="Leer speichern stellt den Startwert aus euren Reels wieder her.">
              <Textarea name="referenzen" defaultValue={o.referenzen} rows={14} readOnly={!isAdmin} className="min-h-80 text-[14px]" />
            </Field>
            {isAdmin && (
              <div className="flex justify-end">
                <SubmitButton variant="secondary">Speichern</SubmitButton>
              </div>
            )}
          </ActionForm>
        </div>
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
      {isAdmin && (
        <Card>
          <CardHeader title={approved ? "Freigabe ändern" : "Freigabe eintragen"} />
          <ActionForm action={saveLegalApproval} className="grid gap-4 px-5 pb-5 pt-1">
            <FormGrid>
              <Field label="Geprüft von" name="approvedBy" hint="Kanzlei oder Name">
                <Input name="approvedBy" defaultValue={approved ? o.legal!.approvedBy : undefined} />
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
          <ActionButton
            action={revokeLegalApproval}
            variant="ghost"
            size="md"
            confirm={{ title: "Freigabe entfernen?", message: "Neue PDFs tragen dann wieder den Vermerk „Entwurf, anwaltlich zu prüfen“.", confirmLabel: "Freigabe entfernen", tone: "danger" }}
          >
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

export function DatenschutzPane({ o, isAdmin, audit, withLogins }: { o: O; isAdmin: boolean; audit: AuditRow[]; withLogins: boolean }) {
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

      <Card>
        <CardHeader title="Verträge zur Auftragsverarbeitung" sub="Datum eintragen, sobald der AV-Vertrag mit dem Dienst abgeschlossen ist." />
        <ActionForm action={savePrivacy} className="grid gap-4 px-5 pb-5 pt-1">
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
        <CardHeader
          title="Änderungsprotokoll"
          sub={`Jeder Eintrag enthält den Prüfwert des vorherigen. Nachträgliche Änderungen fallen auf.${withLogins ? "" : " Anmeldungen sind ausgeblendet."}`}
        />
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          <LinkButton href={withLogins ? "/einstellungen?reiter=datenschutz" : "/einstellungen?reiter=datenschutz&anmeldungen=1"} variant="secondary" size="sm" scroll={false} replace>
            {withLogins ? "Anmeldungen ausblenden" : "Anmeldungen zeigen"}
          </LinkButton>
          {isAdmin && (
            <ActionButton action={checkAuditChain} variant="secondary">
              <CheckCircle2 className="size-4" /> Protokoll prüfen
            </ActionButton>
          )}
        </div>
        <ul className="divide-y divide-hairline border-t border-hairline">
          {audit.map(({ a, userName }) => {
            const href = auditHref(a.entity, a.entityId, a.action);
            const target = (
              <>
                {AUDIT_ENTITY[a.entity] ?? a.entity}
                {a.entityId ? ` ${a.entityId}` : ""}
              </>
            );
            return (
              <li key={a.id} className="flex items-start gap-3 px-5 py-2.5 text-[14px]">
                <span className="w-12 shrink-0 pt-px text-[13px] tabular-nums text-muted">#{a.id}</span>
                <span className="min-w-0 flex-1">
                  <span className="block">
                    {href ? (
                      <Link href={href} className="font-medium text-ink underline decoration-line-2 underline-offset-2 hover:decoration-ink">
                        {target}
                      </Link>
                    ) : (
                      <span className="font-medium text-ink">{target}</span>
                    )}
                    <span className="text-muted"> · {auditAction(a.action)}</span>
                  </span>
                  <span className="block text-[13px] text-muted sm:hidden">
                    {userName ?? "System"} · {dateTime(a.at)}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] text-muted max-sm:hidden">{userName ?? "System"}</span>
                <span className="shrink-0 text-[13px] tabular-nums text-muted max-sm:hidden">{dateTime(a.at)}</span>
              </li>
            );
          })}
          {audit.length === 0 && <li className="px-5 py-4 text-[14px] text-muted">Noch keine Einträge.</li>}
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
      <AdminNote isAdmin={isAdmin} />
      <Group footer="Vor dem echten Start: Demo-Hinweise ausschalten und die Datenbank in Supabase ohne Demo-Daten anlegen.">
        <li className="flex min-h-12 items-center gap-3 px-4 py-2.5">
          <RowIcon icon={FlaskConical} tone="orange" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] text-ink">Demo-Hinweise</span>
            <span className="block text-[13px] text-muted">Banner in der App, Vermerk in Berichten und PDFs</span>
          </span>
          <DemoSwitch on={o.demo} disabled={!isAdmin} action={setDemoMode} label="Demo-Hinweise" />
        </li>
      </Group>
    </Pane>
  );
}
