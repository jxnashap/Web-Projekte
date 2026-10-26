"use client";
// Felder eines Kunden (Anlegen und Bearbeiten). Rechtsform schlägt die Kaufmannseigenschaft vor,
// weil davon z. B. die Gerichtsstandsklausel im Vertrag abhängt (§ 38 ZPO).
import { Check } from "lucide-react";
import { useState } from "react";
import type { Client } from "@/db/schema";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { CLIENT_COLORS, colorName } from "@/lib/crm/labels";
import { CLIENT_STATUS, LEGAL_FORMS } from "@/lib/labels";

const euro = (cents: number | null | undefined) =>
  cents == null ? "" : (cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t border-hairline pt-6 first:border-t-0 first:pt-0">
      <div>
        <legend className="text-[15px] font-semibold">{title}</legend>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {children}
    </fieldset>
  );
}

export function ClientFields({ client, defaultColor, branchen }: { client?: Client | null; defaultColor?: string; branchen: Record<string, string> }) {
  const c = client ?? null;
  const [legalForm, setLegalForm] = useState(c?.legalForm ?? "");
  const [merchant, setMerchant] = useState(c?.isMerchant ?? false);
  const [color, setColor] = useState(c?.color ?? defaultColor ?? CLIENT_COLORS[0]);
  const palette = CLIENT_COLORS.includes(color) ? CLIENT_COLORS : [...CLIENT_COLORS, color];
  const lf = legalForm ? LEGAL_FORMS[legalForm] : null;

  return (
    <div className="grid gap-6">
      <Section title="Betrieb">
        <FormGrid>
          <Field label="Name" name="name" className="sm:col-span-2">
            <Input name="name" defaultValue={c?.name ?? ""} required autoComplete="organization" placeholder="So, wie er auf Rechnungen stehen soll" autoFocus={!c} />
          </Field>
          <Field label="Branche" name="branche">
            <Select name="branche" defaultValue={c?.branche ?? ""} required>
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
          <Field label="Status" name="status">
            <Select name="status" defaultValue={c?.status ?? "aktiv"}>
              {Object.entries(CLIENT_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-[13px] font-medium text-ink-2">
            Farbe <span className="font-normal text-muted">für Kalender und Übersichten · {colorName(color)}</span>
          </legend>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {palette.map((col) => (
              <label key={col} className="relative cursor-pointer" title={colorName(col)}>
                <input type="radio" name="color" value={col} checked={color === col} onChange={() => setColor(col)} className="peer sr-only" />
                <span
                  className="grid size-11 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-shadow peer-checked:ring-2 peer-checked:ring-ink/25 peer-focus-visible:ring-2 peer-focus-visible:ring-accent sm:size-9"
                  style={{ background: col }}
                  aria-hidden
                >
                  {color === col && <Check className="size-4 text-white" strokeWidth={3} />}
                </span>
                <span className="sr-only">{colorName(col)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section title="Kontakt">
        <FormGrid>
          <Field label="Ansprechpartner" name="contactName" optional>
            <Input name="contactName" defaultValue={c?.contactName ?? ""} autoComplete="name" />
          </Field>
          <Field label="Telefon" name="phone" optional>
            <Input name="phone" type="tel" inputMode="tel" defaultValue={c?.phone ?? ""} autoComplete="tel" />
          </Field>
          <Field label="E-Mail" name="email" optional>
            <Input name="email" type="email" inputMode="email" defaultValue={c?.email ?? ""} autoComplete="email" />
          </Field>
          <Field label="Website" name="website" optional>
            <Input name="website" defaultValue={c?.website ?? ""} placeholder="www.beispiel.de" inputMode="url" autoCapitalize="none" autoComplete="url" />
          </Field>
          <Field label="Instagram" name="instagram" optional hint="Benutzername oder Profil-Link">
            <Input name="instagram" defaultValue={c?.instagram ?? ""} placeholder="@benutzername" autoCapitalize="none" />
          </Field>
          <Field label="TikTok" name="tiktok" optional>
            <Input name="tiktok" defaultValue={c?.tiktok ?? ""} placeholder="@benutzername" autoCapitalize="none" />
          </Field>
        </FormGrid>
      </Section>

      <Section title="Anschrift" sub="Für Rechnungen und Verträge">
        <FormGrid>
          <Field label="Straße und Hausnummer" name="street" optional className="sm:col-span-2">
            <Input name="street" defaultValue={c?.street ?? ""} autoComplete="street-address" />
          </Field>
          <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-4 sm:col-span-2 sm:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)]">
            <Field label="PLZ" name="zip" optional>
              <Input name="zip" defaultValue={c?.zip ?? ""} inputMode="numeric" autoComplete="postal-code" />
            </Field>
            <Field label="Stadt" name="city" optional>
              <Input name="city" defaultValue={c?.city ?? ""} autoComplete="address-level2" />
            </Field>
            <Field label="Standort für Übersichten" name="ort" optional hint="z. B. Lübeck-Travemünde" className="col-span-2 sm:col-span-1">
              <Input name="ort" defaultValue={c?.ort ?? ""} />
            </Field>
          </div>
        </FormGrid>
      </Section>

      <Section title="Vertrag und Rechnung" sub="Braucht ihr für Dienstleistungsvertrag und E-Rechnung. Nur eintragen, was der Kunde bestätigt hat.">
        <FormGrid>
          <Field label="Rechtsform" name="legalForm" optional>
            <Select
              name="legalForm"
              value={legalForm}
              onChange={(e) => {
                setLegalForm(e.target.value);
                const m = LEGAL_FORMS[e.target.value]?.merchant;
                if (m !== null && m !== undefined) setMerchant(m);
              }}
            >
              <option value="">Noch nicht bekannt</option>
              {Object.entries(LEGAL_FORMS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Registernummer" name="registerNumber" optional hint="z. B. HRB 12345 KI">
            <Input name="registerNumber" defaultValue={c?.registerNumber ?? ""} />
          </Field>
          <div className="grid gap-1.5 sm:col-span-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-[12px] bg-fill-2 px-3.5 py-3 text-[14px] transition-colors hover:bg-fill has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
              <input
                type="checkbox"
                name="isMerchant"
                checked={merchant}
                onChange={(e) => setMerchant(e.target.checked)}
                className="mt-0.5 size-[18px] shrink-0 accent-[var(--color-accent)] focus-visible:outline-none"
              />
              <span>
                <span className="font-semibold">Kaufmann im Sinne des HGB</span>
                <span className="block text-[13px] text-muted">
                  {lf?.merchant === true
                    ? `${lf.label}: in der Regel Kaufmann. Gerichtsstandsklauseln sind dann möglich.`
                    : lf?.merchant === false
                      ? `${lf.label}: in der Regel kein Kaufmann. Im Vertrag gilt dann der gesetzliche Gerichtsstand.`
                      : "Entscheidet z. B., ob im Vertrag ein Gerichtsstand vereinbart werden darf (§ 38 ZPO)."}
                </span>
              </span>
            </label>
          </div>
          <Field label="Unterzeichner" name="signatoryName" optional hint="Wer unterschreibt für den Kunden?">
            <Input name="signatoryName" defaultValue={c?.signatoryName ?? ""} autoComplete="name" />
          </Field>
          <Field label="Funktion" name="signatoryRole" optional hint="z. B. Inhaber, Geschäftsführerin">
            <Input name="signatoryRole" defaultValue={c?.signatoryRole ?? ""} />
          </Field>
          <Field label="USt-IdNr." name="vatId" optional>
            <Input name="vatId" defaultValue={c?.vatId ?? ""} placeholder="DE123456789" autoCapitalize="characters" />
          </Field>
          <Field label="Steuernummer" name="taxNumber" optional>
            <Input name="taxNumber" defaultValue={c?.taxNumber ?? ""} />
          </Field>
          <Field label="Käuferreferenz oder Leitweg-ID" name="buyerReference" optional hint="Nur wenn der Kunde sie für E-Rechnungen vorgibt" className="sm:col-span-2">
            <Input name="buyerReference" defaultValue={c?.buyerReference ?? ""} />
          </Field>
        </FormGrid>
      </Section>

      <Section title="Paket">
        <FormGrid className="lg:grid-cols-3">
          <Field label="Videos pro Monat" name="packageVideos" optional>
            <Select name="packageVideos" defaultValue={c?.packageVideos ? String(c.packageVideos) : ""}>
              <option value="">Kein Paket</option>
              {[4, 8, 12].map((n) => (
                <option key={n} value={n}>
                  {n} Videos
                </option>
              ))}
              {c?.packageVideos && ![4, 8, 12].includes(c.packageVideos) && <option value={c.packageVideos}>{c.packageVideos} Videos</option>}
            </Select>
          </Field>
          <Field label="Preis netto pro Monat" name="packagePrice" optional>
            <div className="relative">
              <Input name="packagePrice" defaultValue={euro(c?.packagePriceCents)} inputMode="decimal" placeholder="0,00" className="pr-8" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">€</span>
            </div>
          </Field>
          <Field label="Start" name="startDate" optional>
            <Input name="startDate" type="date" defaultValue={c?.startDate ?? ""} />
          </Field>
        </FormGrid>
      </Section>

      <Section title="Notizen">
        <Field label="Interne Notizen" name="notes" optional>
          <Textarea name="notes" defaultValue={c?.notes ?? ""} rows={4} placeholder="Ton, Formate, Besonderheiten beim Dreh …" />
        </Field>
      </Section>
    </div>
  );
}
