"use server";
// Server Actions für Anfragen und Kunden: prüfen Anmeldung und Eingaben, schreiben ins Protokoll
// und aktualisieren danach die Ansicht (refresh).
import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { getDb, schema } from "@/db";
import { type ActionState, done, fail, parseForm } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth";
import { BRANCHEN, LEAD_STAGES } from "@/lib/labels";
import { clientDependencies } from "./data";
import { CLIENT_COLORS, scoreFor } from "./labels";
import { type ClientInput, clientSchema, convertSchema, type LeadInput, leadSchema, lostSchema, notesSchema, STAGE_KEYS } from "./schemas";

const { leads, clients } = schema;

const nul = <T,>(v: T | undefined) => (v === undefined ? null : v);

function leadValues(d: LeadInput) {
  const score = !d.score || d.score === "auto" ? (d.packageInterest || d.startWish ? scoreFor(d.packageInterest, d.startWish) : null) : d.score;
  return {
    name: d.name,
    company: d.company,
    branche: nul(d.branche),
    ort: nul(d.ort),
    phone: nul(d.phone),
    email: nul(d.email),
    contactWay: nul(d.contactWay),
    source: d.source,
    packageInterest: nul(d.packageInterest),
    startWish: nul(d.startWish),
    score,
    nextStep: nul(d.nextStep),
    nextStepAt: nul(d.nextStepAt),
    message: nul(d.message),
    notes: nul(d.notes),
  };
}

// ------------------------------------------------------------------
// Anfragen
// ------------------------------------------------------------------
export async function createLead(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(leadSchema, fd);
  if (!p.success) return p.state;
  const db = await getDb();
  const [row] = await db
    .insert(leads)
    .values({ ...leadValues(p.data), stage: p.data.stage ?? "neu" })
    .returning({ id: leads.id });
  await audit(user.id, "lead", row.id, "angelegt", { firma: p.data.company });
  refresh();
  return done(`Anfrage von ${p.data.company} angelegt`, { id: row.id });
}

export async function updateLead(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(leadSchema, fd);
  if (!p.success) return p.state;
  const db = await getDb();
  const values = leadValues(p.data);
  const [row] = await db
    .update(leads)
    .set({ ...values, ...(p.data.stage ? { stage: p.data.stage } : {}), updatedAt: new Date() })
    .where(eq(leads.id, id))
    .returning({ id: leads.id });
  if (!row) return fail("Anfrage nicht gefunden");
  await audit(user.id, "lead", id, "geändert");
  refresh();
  return done("Anfrage gespeichert");
}

export async function setLeadStage(id: number, stage: string): Promise<ActionState> {
  const user = await assertUser();
  if (!STAGE_KEYS.includes(stage)) return fail("Unbekannte Stufe");
  const db = await getDb();
  const [before] = await db.select({ stage: leads.stage, company: leads.company }).from(leads).where(eq(leads.id, id));
  if (!before) return fail("Anfrage nicht gefunden");
  if (before.stage === stage) return done("Unverändert");
  await db.update(leads).set({ stage, updatedAt: new Date() }).where(eq(leads.id, id));
  await audit(user.id, "lead", id, "stufe", { von: before.stage, nach: stage });
  refresh();
  const label = LEAD_STAGES.find((s) => s.key === stage)?.label ?? stage;
  return done(`${before.company}: ${label}`);
}

export async function markLeadLost(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(lostSchema, fd);
  if (!p.success) return p.state;
  const db = await getDb();
  await db
    .update(leads)
    .set({ stage: "verloren", lostReason: p.data.lostReason, nextStep: null, nextStepAt: null, updatedAt: new Date() })
    .where(eq(leads.id, id));
  await audit(user.id, "lead", id, "verloren", { grund: p.data.lostReason });
  refresh();
  return done("Als verloren markiert");
}

export async function reopenLead(id: number): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  await db.update(leads).set({ stage: "kontaktiert", lostReason: null, updatedAt: new Date() }).where(eq(leads.id, id));
  await audit(user.id, "lead", id, "wieder_geoeffnet");
  refresh();
  return done("Anfrage wieder geöffnet");
}

/** Aus einer Anfrage einen Kunden machen (Stufe "Gewonnen", Verknüpfung bleibt erhalten). */
export async function convertLead(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(convertSchema, fd);
  if (!p.success) return p.state;
  const db = await getDb();
  const [lead] = await db.select().from(leads).where(eq(leads.id, id));
  if (!lead) return fail("Anfrage nicht gefunden");
  if (lead.clientId) return done("Ist schon Kunde", { redirectTo: `/kunden/${lead.clientId}` });
  const used = await db.select({ color: clients.color }).from(clients);
  const color = CLIENT_COLORS.find((c) => !used.some((u) => u.color.toLowerCase() === c.toLowerCase())) ?? CLIENT_COLORS[0];
  const clientId = await db.transaction(async (tx) => {
    const [c] = await tx
      .insert(clients)
      .values({
        name: p.data.name,
        branche: lead.branche && lead.branche in BRANCHEN ? lead.branche : "unternehmen",
        status: p.data.status,
        ort: lead.ort,
        city: lead.ort,
        contactName: lead.name,
        email: lead.email,
        phone: lead.phone,
        packageVideos: p.data.packageVideos ?? null,
        color,
        notes: lead.notes ? `Aus Anfrage übernommen:\n${lead.notes}` : null,
      })
      .returning({ id: clients.id });
    await tx.update(leads).set({ stage: "gewonnen", clientId: c.id, updatedAt: new Date() }).where(eq(leads.id, id));
    return c.id;
  });
  await audit(user.id, "client", clientId, "angelegt", { ausAnfrage: id });
  await audit(user.id, "lead", id, "umgewandelt", { kunde: clientId });
  refresh();
  return done(`${p.data.name} ist jetzt Kunde`, { redirectTo: `/kunden/${clientId}`, id: clientId });
}

export async function deleteLead(id: number): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  const [row] = await db.delete(leads).where(eq(leads.id, id)).returning({ company: leads.company });
  if (!row) return fail("Anfrage nicht gefunden");
  await audit(user.id, "lead", id, "gelöscht");
  // kein refresh(): die aktuelle Seite gibt es nicht mehr, der Client wechselt zur Liste
  return done(`Anfrage von ${row.company} gelöscht`, { redirectTo: "/anfragen" });
}

// ------------------------------------------------------------------
// Kunden
// ------------------------------------------------------------------
function clientValues(d: ClientInput) {
  return {
    name: d.name,
    branche: d.branche,
    status: d.status,
    color: d.color,
    contactName: nul(d.contactName),
    email: nul(d.email),
    phone: nul(d.phone),
    website: nul(d.website),
    instagram: d.instagram,
    tiktok: d.tiktok,
    street: nul(d.street),
    zip: nul(d.zip),
    city: nul(d.city),
    ort: d.ort ?? d.city ?? null,
    vatId: d.vatId,
    taxNumber: nul(d.taxNumber),
    legalForm: nul(d.legalForm),
    isMerchant: d.isMerchant,
    registerNumber: nul(d.registerNumber),
    signatoryName: nul(d.signatoryName),
    signatoryRole: nul(d.signatoryRole),
    buyerReference: nul(d.buyerReference),
    packageVideos: nul(d.packageVideos),
    packagePriceCents: d.packagePrice,
    startDate: nul(d.startDate),
    notes: nul(d.notes),
  };
}

const LABELS: Record<string, string> = {
  name: "Name", branche: "Branche", status: "Status", color: "Farbe", contactName: "Ansprechpartner", email: "E-Mail",
  phone: "Telefon", website: "Website", instagram: "Instagram", tiktok: "TikTok", street: "Straße", zip: "PLZ", city: "Stadt",
  ort: "Standort", vatId: "USt-IdNr.", taxNumber: "Steuernummer", legalForm: "Rechtsform", isMerchant: "Kaufmann",
  registerNumber: "Registernummer", signatoryName: "Unterzeichner", signatoryRole: "Funktion", buyerReference: "Käuferreferenz",
  packageVideos: "Paket", packagePriceCents: "Preis", startDate: "Start", notes: "Notizen",
};

export async function createClient(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(clientSchema, fd);
  if (!p.success) return p.state;
  const db = await getDb();
  const [row] = await db.insert(clients).values(clientValues(p.data)).returning({ id: clients.id });
  await audit(user.id, "client", row.id, "angelegt");
  refresh();
  return done(`${p.data.name} angelegt`, { redirectTo: `/kunden/${row.id}`, id: row.id });
}

export async function updateClient(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(clientSchema, fd);
  if (!p.success) return p.state;
  const db = await getDb();
  const [before] = await db.select().from(clients).where(eq(clients.id, id));
  if (!before) return fail("Kunde nicht gefunden");
  const values = clientValues(p.data);
  const changed = (Object.keys(values) as (keyof typeof values)[]).filter((k) => String(before[k] ?? "") !== String(values[k] ?? ""));
  await db.update(clients).set({ ...values, updatedAt: new Date() }).where(eq(clients.id, id));
  if (changed.length) await audit(user.id, "client", id, "geändert", { felder: changed.map((k) => LABELS[k] ?? k) });
  refresh();
  return done(changed.length ? "Kundendaten gespeichert" : "Keine Änderungen", { redirectTo: `/kunden/${id}` });
}

export async function updateClientNotes(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(notesSchema, fd);
  if (!p.success) return p.state;
  const db = await getDb();
  await db.update(clients).set({ notes: p.data.notes ?? null, updatedAt: new Date() }).where(eq(clients.id, id));
  await audit(user.id, "client", id, "geändert", { felder: ["Notizen"] });
  refresh();
  return done("Notizen gespeichert");
}

export async function setClientStatus(id: number, status: string): Promise<ActionState> {
  const user = await assertUser();
  if (!["aktiv", "test", "pausiert", "beendet"].includes(status)) return fail("Unbekannter Status");
  const db = await getDb();
  const [row] = await db
    .update(clients)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(clients.id, id)))
    .returning({ name: clients.name });
  if (!row) return fail("Kunde nicht gefunden");
  await audit(user.id, "client", id, "status", { status });
  refresh();
  return done(status === "beendet" ? `${row.name} ist beendet` : "Status geändert");
}

/** Löschen nur ohne abhängige Daten (Videos, Rechnungen, Dokumente, Termine, Belege, Skripte). */
export async function deleteClient(id: number): Promise<ActionState> {
  const user = await assertUser();
  const deps = await clientDependencies(id);
  if (deps > 0) return fail("Zu diesem Kunden gibt es schon Videos, Termine, Rechnungen oder Dokumente. Setzt den Status auf „Beendet“.");
  const db = await getDb();
  const [row] = await db.delete(clients).where(eq(clients.id, id)).returning({ name: clients.name });
  if (!row) return fail("Kunde nicht gefunden");
  await audit(user.id, "client", id, "gelöscht", { name: row.name });
  return done(`${row.name} gelöscht`, { redirectTo: "/kunden" });
}
