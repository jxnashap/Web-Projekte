"use server";
// Einstellungen ändern: nur Inhaber (role admin). Jede Änderung landet im Änderungsprotokoll.
import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { getDb, schema } from "@/db";
import { done, fail, parseForm, type ActionState } from "@/lib/action";
import { audit, verifyAuditChain } from "@/lib/audit";
import { assertAdmin, type CurrentUser } from "@/lib/auth";
import { LEGAL_TEMPLATE_VERSION } from "@/lib/dokumente/schema";
import { getCompany, setSetting, type Company } from "@/lib/settings";
import { todayIso } from "@/lib/time";
import { aiSchema, companySchema, legalSchema, privacySchema } from "./schema";

async function admin(): Promise<CurrentUser | null> {
  try {
    return await assertAdmin();
  } catch {
    return null;
  }
}
const NO_ADMIN = "Nur Inhaber können Einstellungen ändern.";

export async function saveCompany(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await admin();
  if (!me) return fail(NO_ADMIN);
  const r = parseForm(companySchema, fd);
  if (!r.success) return r.state;
  const prev = await getCompany();
  const d = r.data;
  const next: Company = {
    brand: d.brand,
    legalName: d.legalName,
    owner: d.owner ?? "",
    street: d.street,
    zip: d.zip,
    city: d.city,
    country: prev?.country ?? "DE",
    vatId: d.vatId ?? "",
    taxNumber: d.taxNumber ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    web: d.web ?? "",
    bankName: d.bankName ?? "",
    iban: d.iban ?? "",
    bic: d.bic ?? "",
    paymentDays: d.paymentDays,
    smallBusiness: d.smallBusiness,
  };
  await setSetting("company", next);
  const changed = prev ? (Object.keys(next) as (keyof Company)[]).filter((k) => prev[k] !== next[k]) : Object.keys(next);
  await audit(me.id, "settings", null, "firma", { changed });
  refresh();
  return done("Firmendaten gespeichert");
}

export async function saveAi(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await admin();
  if (!me) return fail(NO_ADMIN);
  const raw = Object.fromEntries(fd.entries());
  if (raw.model === "eigenes") raw.model = String(raw.customModel ?? "").trim();
  const f = new FormData();
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") f.set(k, v);
  const r = parseForm(aiSchema, f);
  if (!r.success) return r.state.fieldErrors?.model ? { ...r.state, fieldErrors: { ...r.state.fieldErrors, customModel: r.state.fieldErrors.model } } : r.state;
  await setSetting("ai", r.data);
  await audit(me.id, "settings", null, "ki", r.data);
  refresh();
  return done(`KI-Modell: ${r.data.model}, Nachdenken: ${r.data.effort}`);
}

export async function saveLegalApproval(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await admin();
  if (!me) return fail(NO_ADMIN);
  const r = parseForm(legalSchema, fd);
  if (!r.success) return r.state;
  if (r.data.approvedAt > todayIso()) return fail("Das Datum liegt in der Zukunft.", { approvedAt: ["Datum liegt in der Zukunft"] });
  const value = { approvedVersion: LEGAL_TEMPLATE_VERSION, approvedBy: r.data.approvedBy, approvedAt: r.data.approvedAt };
  await setSetting("legal", value);
  await audit(me.id, "settings", null, "vorlagen_freigegeben", value);
  refresh();
  return done("Freigabe gespeichert. Neue PDFs erscheinen ohne Entwurfsvermerk.");
}

export async function revokeLegalApproval(): Promise<ActionState> {
  const me = await admin();
  if (!me) return fail(NO_ADMIN);
  const db = await getDb();
  await db.delete(schema.settings).where(eq(schema.settings.key, "legal"));
  await audit(me.id, "settings", null, "vorlagen_freigabe_entfernt");
  refresh();
  return done("Freigabe entfernt. PDFs tragen wieder den Entwurfsvermerk.");
}

export async function savePrivacy(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await admin();
  if (!me) return fail(NO_ADMIN);
  const r = parseForm(privacySchema, fd);
  if (!r.success) return r.state;
  const avv = Object.fromEntries(Object.entries(r.data).filter(([, v]) => Boolean(v)));
  await setSetting("privacy", { avv });
  await audit(me.id, "settings", null, "avv", avv);
  refresh();
  return done("Auftragsverarbeitung gespeichert");
}

export async function checkAuditChain(): Promise<ActionState> {
  const me = await admin();
  if (!me) return fail(NO_ADMIN);
  const r = await verifyAuditChain();
  if (r.ok) return done(`Protokoll unversehrt: ${r.count} Einträge geprüft.`);
  return fail(`Auffällig ab Eintrag ${r.brokenAt}. Bitte nicht weiterarbeiten und den Datenbank-Verlauf prüfen.`);
}

export async function setDemoMode(on: boolean): Promise<ActionState> {
  const me = await admin();
  if (!me) return fail(NO_ADMIN);
  await setSetting("demo", on);
  await audit(me.id, "settings", null, "demo", { on });
  refresh();
  return done(on ? "Demo-Hinweise an" : "Demo-Hinweise aus");
}
