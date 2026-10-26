"use server";
// Server Actions für Anfragen und Kunden: prüfen Anmeldung und Eingaben, schreiben ins Protokoll
// und aktualisieren danach die Ansicht (refresh).
import { and, eq, isNull, notInArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { getDb, schema } from "@/db";
import { type ActionState, done, fail, parseForm } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth";
import { isBranche } from "@/lib/branchen";
import { saveEvent } from "@/lib/kalender/actions";
import { LEAD_STAGES } from "@/lib/labels";
import { clientDependencies } from "./data";
import { CLIENT_COLORS, scoreFor } from "./labels";
import { type ClientInput, clientSchema, convertSchema, type LeadInput, leadSchema, lostSchema, notesSchema, STAGE_KEYS } from "./schemas";

const { leads, clients } = schema;

const nul = <T,>(v: T | undefined) => (v === undefined ? null : v);

/** Abgeschlossene Stufen setzen nur eigene Abläufe: Gewonnen über "Zum Kunden machen", Verloren mit Grund. */
const CLOSED = ["gewonnen", "verloren"];

function leadValues(d: LeadInput) {
  const score = !d.score || d.score === "auto" ? (d.packageInterest || d.startWish ? scoreFor(d.packageInterest, d.startWish) : null) : d.score;
  return {
    name: d.name ?? d.company,
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

const stageLabel = (key: string) => LEAD_STAGES.find((s) => s.key === key)?.label ?? key;

// ------------------------------------------------------------------
// Anfragen
// ------------------------------------------------------------------
export async function createLead(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(leadSchema, fd);
  if (!p.success) return p.state;
  const db = await getDb();
  const stage = p.data.stage && !CLOSED.includes(p.data.stage) ? p.data.stage : "neu";
  const [row] = await db
    .insert(leads)
    .values({ ...leadValues(p.data), stage })
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
  // Die Stufe ändert sich nur über setLeadStage, convertLead und markLeadLost
  const [row] = await db.update(leads).set({ ...values, updatedAt: new Date() }).where(eq(leads.id, id)).returning({ id: leads.id });
  if (!row) return fail("Anfrage nicht gefunden");
  await audit(user.id, "lead", id, "geändert");
  refresh();
  return done("Anfrage gespeichert");
}

export async function setLeadStage(id: number, stage: string): Promise<ActionState> {
  const user = await assertUser();
  if (!STAGE_KEYS.includes(stage)) return fail("Unbekannte Stufe");
  if (stage === "gewonnen") return fail("Gewonnen wird eine Anfrage über „Zum Kunden machen“.");
  if (stage === "verloren") return fail("Für „Verloren“ bitte einen Grund angeben.");
  const db = await getDb();
  const [before] = await db.select({ stage: leads.stage, company: leads.company, clientId: leads.clientId }).from(leads).where(eq(leads.id, id));
  if (!before) return fail("Anfrage nicht gefunden");
  if (before.clientId) return fail(`${before.company} ist schon Kunde. Die Stufe bleibt „Gewonnen“.`);
  if (before.stage === stage) return done("Unverändert");
  // Wer eine verlorene Anfrage wieder aufnimmt, braucht den alten Grund nicht mehr als Status
  await db
    .update(leads)
    .set({ stage, ...(before.stage === "verloren" ? { lostReason: null } : {}), updatedAt: new Date() })
    .where(eq(leads.id, id));
  await audit(user.id, "lead", id, "stufe", { von: before.stage, nach: stage });
  refresh();
  return done(`${before.company}: ${stageLabel(stage)}`);
}

export async function markLeadLost(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(lostSchema, fd);
  if (!p.success) return p.state;
  const db = await getDb();
  const [before] = await db.select({ company: leads.company, clientId: leads.clientId }).from(leads).where(eq(leads.id, id));
  if (!before) return fail("Anfrage nicht gefunden");
  if (before.clientId) return fail(`${before.company} ist schon Kunde. Beendet die Zusammenarbeit beim Kunden.`);
  await db
    .update(leads)
    .set({ stage: "verloren", lostReason: p.data.lostReason, nextStep: null, nextStepAt: null, updatedAt: new Date() })
    .where(eq(leads.id, id));
  await audit(user.id, "lead", id, "verloren", { grund: p.data.lostReason });
  refresh();
  return done(`${before.company}: als verloren markiert`);
}

export async function reopenLead(id: number): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  const [row] = await db
    .update(leads)
    .set({ stage: "kontaktiert", lostReason: null, updatedAt: new Date() })
    .where(and(eq(leads.id, id), isNull(leads.clientId)))
    .returning({ company: leads.company });
  if (!row) return fail("Anfrage nicht gefunden oder schon Kunde");
  await audit(user.id, "lead", id, "wieder_geoeffnet");
  refresh();
  return done(`${row.company}: wieder geöffnet, Stufe Kontaktiert`);
}

/** Aus einer Anfrage einen Kunden machen (Stufe "Gewonnen", Verknüpfung bleibt erhalten). */
export async function convertLead(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(convertSchema, fd);
  if (!p.success) return p.state;
  if (!(await isBranche(p.data.branche))) return fail("Branche wählen", { branche: ["Diese Branche gibt es nicht (mehr)."] });
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
        branche: p.data.branche,
        status: p.data.status,
        ort: lead.ort,
        city: lead.ort,
        contactName: lead.name !== lead.company ? lead.name : null,
        email: lead.email,
        phone: lead.phone,
        // Testkunden haben noch kein Paket und damit kein Kontingent
        packageVideos: p.data.status === "aktiv" ? (p.data.packageVideos ?? null) : null,
        color,
        notes: lead.notes ? `Aus Anfrage übernommen:\n${lead.notes}` : null,
      })
      .returning({ id: clients.id });
    await tx
      .update(leads)
      .set({ stage: "gewonnen", clientId: c.id, lostReason: null, nextStep: null, nextStepAt: null, updatedAt: new Date() })
      .where(eq(leads.id, id));
    return c.id;
  });
  await audit(user.id, "client", clientId, "angelegt", { ausAnfrage: id });
  await audit(user.id, "lead", id, "umgewandelt", { kunde: clientId });
  // kein refresh(): die Weiterleitung zum neuen Kunden lädt ohnehin frisch
  return done(`${p.data.name} ist jetzt Kunde`, { redirectTo: `/kunden/${clientId}`, id: clientId });
}

/**
 * Termin zu einer Anfrage anlegen (Formular aus dem Kalender, direkt auf der Anfrage).
 * Danach wird der Termin zum nächsten Schritt der Anfrage, solange sie offen ist.
 */
export async function addLeadEvent(id: number, prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const r = await saveEvent(prev, fd);
  if (!r.ok) return r;
  if (Number(fd.get("leadId")) === id) {
    const title = String(fd.get("title") ?? "").trim();
    const day = String(fd.get("startDate") ?? "");
    const db = await getDb();
    const [row] = await db
      .update(leads)
      .set({ nextStep: title || "Termin", nextStepAt: /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null, updatedAt: new Date() })
      .where(and(eq(leads.id, id), notInArray(leads.stage, CLOSED)))
      .returning({ id: leads.id });
    if (row) await audit(user.id, "lead", id, "geändert", { naechsterSchritt: title });
  }
  refresh();
  return done("Termin angelegt und als nächster Schritt eingetragen", { id: r.id });
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
  if (!(await isBranche(p.data.branche))) return fail("Branche wählen", { branche: ["Diese Branche gibt es nicht (mehr)."] });
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
  if (!(await isBranche(p.data.branche))) return fail("Branche wählen", { branche: ["Diese Branche gibt es nicht (mehr)."] });
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
  return done(status === "beendet" ? `${row.name}: Zusammenarbeit beendet` : `${row.name}: Status geändert`);
}

/** Löschen nur ohne abhängige Daten (Videos, Rechnungen, Dokumente, Termine, Belege, Skripte). */
export async function deleteClient(id: number): Promise<ActionState> {
  const user = await assertUser();
  const deps = await clientDependencies(id);
  if (deps > 0) return fail("Zu diesem Kunden gibt es schon Videos, Termine, Rechnungen oder Dokumente. Beendet stattdessen die Zusammenarbeit.");
  const db = await getDb();
  const [row] = await db.delete(clients).where(eq(clients.id, id)).returning({ name: clients.name });
  if (!row) return fail("Kunde nicht gefunden");
  await audit(user.id, "client", id, "gelöscht", { name: row.name });
  return done(`${row.name} gelöscht`, { redirectTo: "/kunden" });
}
