"use server";
// Server Actions für Dokumente: anlegen, bearbeiten, festhalten (zur Unterschrift freigeben bzw. ablegen),
// unterschreiben, widerrufen, in den Papierkorb legen.
// Unterschriebene Dokumente sind in der Datenbank unveränderlich (Trigger), nur ein Widerruf wird vermerkt.
// Gelöscht wird über den Papierkorb: 14 Tage wiederherstellbar, danach endgültig (auch unterschriebene).
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getDb, schema } from "@/db";
import type { Doc } from "@/db/schema";
import { done, fail, formToObject, parseForm, type ActionState } from "@/lib/action";
import { assertUser, type CurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";
import { getCompany, type Company } from "@/lib/settings";
import { putFile } from "@/lib/storage";
import { berlinDateTime, todayIso } from "@/lib/time";
import { buildDrehplanSnapshot, buildReportSnapshot, partyOf } from "./data";
import { purgeDocuments } from "./papierkorb";
import type { SignProof } from "./pdf/types";
import { buildRenderCtx, pdfFileName, renderDocument } from "./render";
import {
  canonicalJson,
  consentController,
  consentSigners,
  controllerProblem,
  DEFAULT_CHECKLISTE,
  defaultVertrag,
  drehplanSchema,
  einwilligungSchema,
  isDocKind,
  LEGAL_TEMPLATE_VERSION,
  monatsberichtSchema,
  REPORT_TEMPLATE_VERSION,
  strokesSchema,
  TRASH_DAYS,
  vertragSchema,
  ZWECK_KEYS,
  zweckKeysFor,
  type DrehplanData,
  type EinwilligungData,
  type MonatsberichtData,
  type PartySnapshot,
  type SignatureEntry,
  type VertragData,
} from "./schema";

const KIND_LABEL: Record<string, string> = { vertrag: "Dienstleistungsvertrag", einwilligung: "Einwilligung", drehplan: "Drehplan", monatsbericht: "Monatsbericht" };
const schemaFor = { vertrag: vertragSchema, einwilligung: einwilligungSchema, drehplan: drehplanSchema, monatsbericht: monatsberichtSchema } as const;

const fmtDay = (iso: string) => iso.split("-").reverse().join(".");
const monthName = (ym: string) => new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-15T12:00:00Z`));

async function loadDoc(id: number): Promise<Doc | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const db = await getDb();
  const [doc] = await db.select().from(schema.documents).where(and(eq(schema.documents.id, id), isNull(schema.documents.deletedAt)));
  return doc ?? null;
}

async function loadClient(id: number | null | undefined) {
  if (!id) return null;
  const db = await getDb();
  const [c] = await db.select().from(schema.clients).where(eq(schema.clients.id, id));
  return c ?? null;
}

const dbError = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("GoBD") || msg.includes("Unterschriebene") ? msg.replace(/^.*?(GoBD|Unterschriebene)/, "$1") : "Speichern fehlgeschlagen. Bitte erneut versuchen.";
};

/**
 * Einwilligung an den Auftraggeber anpassen: ohne Kunden ist SCM verantwortlich, und der Zweck
 * "Kanäle des Auftraggebers" entfällt. Liefert einen Feldfehler, wenn "Kunde" ohne Kunden gewählt ist.
 */
function fitConsent(data: EinwilligungData, hasClient: boolean): { data: EinwilligungData } | { error: ActionState } {
  if (!hasClient && data.verantwortlich === "kunde")
    return { error: fail("Ohne Auftraggeber ist SCM verantwortlich.", { verantwortlich: ["Ohne Auftraggeber bitte SCM wählen"] }) };
  const allowed = zweckKeysFor(hasClient);
  return { data: { ...data, zwecke: data.zwecke.filter((z) => allowed.includes(z)) } };
}

/** Prüft, ob die verantwortliche Stelle vollständig ist (Name, Anschrift, E-Mail für Datenschutzfragen). */
function consentReady(data: Pick<EinwilligungData, "verantwortlich">, party: PartySnapshot | null, company: Company | null, hasClient: boolean): ActionState | null {
  const problem = controllerProblem(consentController(data.verantwortlich, party, company), hasClient);
  // ohne Feldfehler: das Formular zeigt den Hinweis mit Link zum Kunden schon unter "Verantwortlich"
  return problem ? fail(problem) : null;
}

// ------------------------------------------------------------------
// Anlegen
// ------------------------------------------------------------------
const createBase = z.object({
  kind: z.string().refine(isDocKind, "Dokumentart wählen"),
  clientId: z.coerce.number().int().positive().optional(),
  intent: z.string().optional(),
});

export async function createDocument(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const base = parseForm(createBase, fd);
  if (!base.success) return base.state;
  const { kind, clientId, intent } = base.data;
  const client = await loadClient(clientId);
  if (kind !== "einwilligung" && !client) return fail("Bitte einen Kunden wählen.", { clientId: ["Kunde wählen"] });

  const db = await getDb();
  let title = "";
  let data: Record<string, unknown> = {};
  let status = "entwurf";
  let templateVersion: string | null = null;

  if (kind === "vertrag") {
    data = defaultVertrag(client!, todayIso());
    title = `Dienstleistungsvertrag ${client!.name}`;
    templateVersion = LEGAL_TEMPLATE_VERSION;
  } else if (kind === "einwilligung") {
    const r = parseForm(einwilligungSchema, fd);
    if (!r.success) return r.state;
    const fitted = fitConsent(r.data, Boolean(client));
    if ("error" in fitted) return fitted.error;
    data = fitted.data;
    title = `Einwilligung ${r.data.personName} · ${fmtDay(r.data.drehtag)}`;
    templateVersion = LEGAL_TEMPLATE_VERSION;
    if (intent === "sign") {
      // direkt am Set: Fassung festhalten und zur Unterschrift, aber nur mit vollständiger verantwortlicher Stelle
      const party = client ? partyOf(client) : null;
      const company = await getCompany();
      const notReady = consentReady(fitted.data, party, company, Boolean(client));
      if (notReady) return notReady;
      status = "final";
      data = { ...data, party, companySnapshot: company };
    }
  } else if (kind === "drehplan") {
    const extra = z.object({ drehtag: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Drehtag wählen"), eventId: z.coerce.number().int().positive().optional() });
    const r = parseForm(extra, fd);
    if (!r.success) return r.state;
    let ev: typeof schema.events.$inferSelect | undefined;
    if (r.data.eventId) [ev] = await db.select().from(schema.events).where(eq(schema.events.id, r.data.eventId));
    const hhmm = (d?: Date) => (d ? new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(d) : undefined);
    data = {
      drehtag: r.data.drehtag,
      eventId: ev?.id,
      ort: ev?.location ?? client?.city ?? "",
      treffpunkt: "",
      start: hhmm(ev?.startsAt),
      ende: hhmm(ev?.endsAt),
      ansprechpartner: client?.contactName ?? "",
      ansprechpartnerTelefon: client?.phone ?? "",
      teamIds: ev?.teamIds ?? [],
      zeitplan: ev ? `${hhmm(ev.startsAt)} Ankunft und Aufbau\n${hhmm(ev.endsAt)} Abbau` : "",
      requisiten: "",
      checkliste: DEFAULT_CHECKLISTE,
      notizen: ev?.notes ?? "",
    } satisfies DrehplanData;
    title = `Drehplan ${client!.name} · ${fmtDay(r.data.drehtag)}`;
    templateVersion = REPORT_TEMPLATE_VERSION;
  } else {
    const r = parseForm(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/, "Monat wählen") }), fd);
    if (!r.success) return r.state;
    data = { month: r.data.month, highlights: "", ausblick: "" } satisfies MonatsberichtData;
    title = `Monatsbericht ${monthName(r.data.month)} · ${client!.name}`;
    templateVersion = REPORT_TEMPLATE_VERSION;
  }

  const [doc] = await db
    .insert(schema.documents)
    .values({ kind, title, clientId: client?.id ?? null, data, status, templateVersion })
    .returning({ id: schema.documents.id });
  await audit(user.id, "document", doc.id, "angelegt", { kind, status });
  refresh();
  return done(`${KIND_LABEL[kind]} angelegt`, {
    id: doc.id,
    redirectTo: kind === "einwilligung" && intent === "sign" ? `/dokumente/${doc.id}/unterschreiben` : `/dokumente/${doc.id}`,
  });
}

// ------------------------------------------------------------------
// Bearbeiten (nur Entwürfe)
// ------------------------------------------------------------------
export async function saveDocument(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const doc = await loadDoc(id);
  if (!doc) return fail("Dokument nicht gefunden.");
  if (doc.status !== "entwurf") return fail("Nur Entwürfe lassen sich bearbeiten. Bitte zuerst „Wieder bearbeiten“ wählen.");
  if (!isDocKind(doc.kind)) return fail("Unbekannte Dokumentart.");
  const r = parseForm(schemaFor[doc.kind] as z.ZodType, fd);
  if (!r.success) return r.state;
  const t = z.object({ title: z.string().min(3, "Titel fehlt").max(160) }).safeParse(formToObject(fd));
  if (!t.success) return fail("Bitte einen Titel eintragen.", { title: ["Titel fehlt"] });
  const finalize = fd.get("intent") === "final";
  let data = r.data as Record<string, unknown>;
  if (doc.kind === "einwilligung") {
    const fitted = fitConsent(r.data as EinwilligungData, Boolean(doc.clientId));
    if ("error" in fitted) return fitted.error;
    data = fitted.data;
    // Vor dem Freigeben prüfen, ob die verantwortliche Stelle vollständig ist; sonst nichts ändern
    if (finalize) {
      const client = await loadClient(doc.clientId);
      const notReady = consentReady(fitted.data, client ? partyOf(client) : null, await getCompany(), Boolean(client));
      if (notReady) return notReady;
    }
  }
  const db = await getDb();
  try {
    await db
      .update(schema.documents)
      .set({ data, title: t.data.title, updatedAt: new Date() })
      .where(and(eq(schema.documents.id, id), eq(schema.documents.status, "entwurf")));
  } catch (e) {
    return fail(dbError(e));
  }
  await audit(user.id, "document", id, "bearbeitet");
  // "Zur Unterschrift freigeben" bzw. "Abschließen und ablegen" sendet dasselbe Formular: erst speichern, dann
  // festhalten. So geht keine ungespeicherte Änderung verloren.
  if (finalize) {
    const saved = await loadDoc(id);
    if (!saved) return fail("Dokument nicht gefunden.");
    const r2 = await finalizeLoaded(saved, user);
    refresh();
    return r2.ok ? r2 : { ...r2, error: `Gespeichert, aber noch nicht festgehalten. ${r2.error ?? ""}`.trim() };
  }
  refresh();
  return done("Gespeichert");
}

// ------------------------------------------------------------------
// Festhalten / wieder öffnen / löschen
// ------------------------------------------------------------------
export async function finalizeDocument(id: number): Promise<ActionState> {
  const user = await assertUser();
  const doc = await loadDoc(id);
  if (!doc) return fail("Dokument nicht gefunden.");
  const r = await finalizeLoaded(doc, user);
  if (r.ok) refresh();
  return r;
}

async function finalizeLoaded(doc: Doc, user: CurrentUser): Promise<ActionState> {
  const id = doc.id;
  if (doc.status !== "entwurf") return fail("Das Dokument ist schon freigegeben oder abgelegt.");
  if (!isDocKind(doc.kind)) return fail("Unbekannte Dokumentart.");
  const check = (schemaFor[doc.kind] as z.ZodType).safeParse(doc.data);
  if (!check.success) return fail("Bitte zuerst alle Pflichtangaben ausfüllen und speichern.");
  const client = await loadClient(doc.clientId);
  const company = await getCompany();
  const party = client ? partyOf(client) : null;
  if (doc.kind === "einwilligung") {
    const notReady = consentReady(doc.data as unknown as EinwilligungData, party, company, Boolean(client));
    if (notReady) return notReady;
  }
  const data: Record<string, unknown> = { ...(doc.data as Record<string, unknown>), party, companySnapshot: company };
  if (doc.kind === "drehplan") {
    const d = doc.data as unknown as DrehplanData;
    data.snapshot = await buildDrehplanSnapshot(doc.clientId, { drehtag: d.drehtag, teamIds: d.teamIds ?? [] });
  }
  if (doc.kind === "monatsbericht" && doc.clientId) {
    data.snapshot = await buildReportSnapshot(doc.clientId, (doc.data as unknown as MonatsberichtData).month);
  }
  const next: Doc = { ...doc, data, status: "final" };
  const db = await getDb();
  try {
    if (doc.kind === "drehplan" || doc.kind === "monatsbericht") {
      // Berichte und Drehpläne werden als Datei festgehalten (byte-genau, mit Hash)
      const pdf = await renderDocument(await buildRenderCtx(next, client));
      const file = await putFile({ bucket: "dokumente", name: pdfFileName(doc), mime: "application/pdf", data: pdf, userId: user.id });
      await db.update(schema.documents).set({ data, status: "final", fileId: file.id, contentHash: file.sha256, updatedAt: new Date() }).where(eq(schema.documents.id, id));
      await audit(user.id, "document", id, "final", { fileId: file.id, sha256: file.sha256 });
    } else {
      await db.update(schema.documents).set({ data, status: "final", updatedAt: new Date() }).where(eq(schema.documents.id, id));
      await audit(user.id, "document", id, "final");
    }
  } catch (e) {
    return fail(dbError(e));
  }
  return done(doc.kind === "vertrag" || doc.kind === "einwilligung" ? "Zur Unterschrift freigegeben" : "Abgeschlossen und als PDF abgelegt");
}

export async function reopenDocument(id: number): Promise<ActionState> {
  const user = await assertUser();
  const doc = await loadDoc(id);
  if (!doc) return fail("Dokument nicht gefunden.");
  if (doc.status !== "final") return fail(doc.status === "unterschrieben" ? "Unterschriebene Dokumente bleiben unverändert." : "Das Dokument ist bereits ein Entwurf.");
  const rest = { ...(doc.data as Record<string, unknown>) };
  delete rest.party;
  delete rest.companySnapshot;
  delete rest.snapshot;
  delete rest.scmSignature;
  const db = await getDb();
  await db.update(schema.documents).set({ data: rest, status: "entwurf", fileId: null, contentHash: null, updatedAt: new Date() }).where(eq(schema.documents.id, id));
  await audit(user.id, "document", id, "wieder_geoeffnet", { previousFileId: doc.fileId });
  refresh();
  return done("Wieder als Entwurf geöffnet");
}

/** In den Papierkorb legen: jedes Dokument, auch unterschriebene (z. B. Test-Einwilligungen). */
export async function trashDocument(id: number): Promise<ActionState> {
  const user = await assertUser();
  const doc = await loadDoc(id);
  if (!doc) return fail("Dokument nicht gefunden.");
  const db = await getDb();
  try {
    await db.update(schema.documents).set({ deletedAt: new Date() }).where(eq(schema.documents.id, id));
  } catch (e) {
    return fail(dbError(e));
  }
  await audit(user.id, "document", id, "papierkorb", { kind: doc.kind, title: doc.title, status: doc.status });
  refresh();
  return done(`In den Papierkorb gelegt, ${TRASH_DAYS} Tage wiederherstellbar`, { redirectTo: "/dokumente" });
}

export async function restoreDocument(id: number): Promise<ActionState> {
  const user = await assertUser();
  if (!Number.isInteger(id) || id <= 0) return fail("Dokument nicht gefunden.");
  const db = await getDb();
  const [doc] = await db
    .update(schema.documents)
    .set({ deletedAt: null })
    .where(and(eq(schema.documents.id, id), isNotNull(schema.documents.deletedAt)))
    .returning({ id: schema.documents.id, title: schema.documents.title });
  if (!doc) return fail("Das Dokument liegt nicht mehr im Papierkorb.");
  await audit(user.id, "document", id, "wiederhergestellt", { title: doc.title });
  refresh();
  return done("Dokument wiederhergestellt");
}

/** Sofort endgültig löschen (nur aus dem Papierkorb). */
export async function purgeDocument(id: number): Promise<ActionState> {
  const user = await assertUser();
  if (!Number.isInteger(id) || id <= 0) return fail("Dokument nicht gefunden.");
  try {
    const n = await purgeDocuments([id], user.id);
    if (n === 0) return fail("Das Dokument liegt nicht mehr im Papierkorb.");
  } catch (e) {
    return fail(dbError(e));
  }
  refresh();
  return done("Endgültig gelöscht");
}

// ------------------------------------------------------------------
// Unterschreiben
// ------------------------------------------------------------------
const signPayload = z.object({
  signatures: z.array(z.object({ role: z.string().max(20), strokes: strokesSchema, name: z.string().max(120).optional() })).min(1).max(4),
  zwecke: z.array(z.enum(ZWECK_KEYS as [string, ...string[]])).optional(),
  place: z.string().max(120).optional(),
  readConfirmed: z.literal(true, { error: "Bitte bestätigen, dass der Text gelesen wurde" }),
});

const roundStrokes = (s: number[][][]) => s.map((st) => st.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]));

async function requestMeta() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || undefined;
  return { ip, userAgent: h.get("user-agent") ?? undefined };
}

/** SCM unterschreibt den Vertrag vorab (Status final, Kunde unterschreibt danach). */
export async function signAsScm(id: number, payloadJson: string): Promise<ActionState> {
  const user = await assertUser();
  const doc = await loadDoc(id);
  if (!doc || doc.kind !== "vertrag") return fail("Vertrag nicht gefunden.");
  if (doc.status !== "final") return fail(doc.status === "entwurf" ? "Bitte den Vertrag zuerst zur Unterschrift freigeben." : "Der Vertrag ist bereits unterschrieben.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadJson);
  } catch {
    return fail("Unterschrift unlesbar.");
  }
  const r = z.object({ strokes: strokesSchema }).safeParse(parsed);
  if (!r.success) return fail(r.error.issues[0]?.message ?? "Bitte unterschreiben.");
  const entry: SignatureEntry = { role: "scm", label: "Für SCM", name: user.name, strokes: roundStrokes(r.data.strokes), signedAt: new Date().toISOString(), byUserId: user.id };
  const db = await getDb();
  await db
    .update(schema.documents)
    .set({ data: { ...(doc.data as Record<string, unknown>), scmSignature: entry }, updatedAt: new Date() })
    .where(and(eq(schema.documents.id, id), eq(schema.documents.status, "final")));
  await audit(user.id, "document", id, "scm_unterschrieben");
  refresh();
  return done("SCM hat unterschrieben");
}

/** Abschluss der Unterschrift(en) am Gerät: rendert die unterschriebene Fassung mit Prüfprotokoll und legt sie ab. */
export async function signDocument(id: number, payloadJson: string): Promise<ActionState> {
  const user = await assertUser();
  const doc = await loadDoc(id);
  if (!doc || (doc.kind !== "vertrag" && doc.kind !== "einwilligung")) return fail("Dokument nicht gefunden.");
  if (doc.status === "unterschrieben") return fail("Dieses Dokument ist bereits unterschrieben.");
  if (doc.status !== "final") return fail("Bitte das Dokument zuerst zur Unterschrift freigeben.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadJson);
  } catch {
    return fail("Unterschrift unlesbar.");
  }
  const r = signPayload.safeParse(parsed);
  if (!r.success) return fail(r.error.issues[0]?.message ?? "Bitte unterschreiben.");
  const p = r.data;
  const now = new Date().toISOString();
  const data = { ...(doc.data as Record<string, unknown>) };
  const signatures: SignatureEntry[] = [];
  let signerName = "";

  if (doc.kind === "vertrag") {
    const d = data as unknown as VertragData;
    let scm = d.scmSignature;
    const scmIn = p.signatures.find((x) => x.role === "scm");
    if (!scm && scmIn) scm = { role: "scm", label: "Für SCM", name: user.name, strokes: roundStrokes(scmIn.strokes), signedAt: now, byUserId: user.id };
    if (!scm) return fail("Es fehlt die Unterschrift von SCM.");
    const kunde = p.signatures.find((x) => x.role === "kunde");
    if (!kunde) return fail("Es fehlt die Unterschrift des Auftraggebers.");
    signerName = (kunde.name || d.unterzeichnerName || d.party?.signatoryName || "").trim();
    if (!signerName) return fail("Bitte den Namen der unterschreibenden Person angeben.");
    signatures.push(scm, { role: "kunde", label: "Für den Auftraggeber", name: signerName, strokes: roundStrokes(kunde.strokes), signedAt: now, byUserId: user.id });
  } else {
    const d = data as unknown as EinwilligungData;
    const notReady = consentReady(d, d.party ?? null, (data.companySnapshot as Company | undefined) ?? null, Boolean(doc.clientId));
    if (notReady) return notReady;
    const needed = consentSigners(d);
    for (const n of needed) {
      const got = p.signatures.find((x) => x.role === n.role);
      if (!got) return fail(`Es fehlt: ${n.label}.`);
      signatures.push({ role: n.role, label: n.label, name: n.name, strokes: roundStrokes(got.strokes), signedAt: now, byUserId: user.id });
    }
    const allowed = zweckKeysFor(Boolean(doc.clientId));
    const zwecke = ((p.zwecke ?? d.zwecke ?? []) as EinwilligungData["zwecke"]).filter((z) => allowed.includes(z));
    if (!zwecke.includes("aufnahme")) return fail("Ohne Einwilligung in die Aufnahme kann nicht gefilmt werden. Dann bitte nicht unterschreiben.");
    data.zweckeBeiUnterschrift = zwecke;
    data.zwecke = zwecke;
    signerName = needed[0].name;
  }
  data.signatures = signatures;
  delete data.scmSignature;

  // Inhalts-Hash der unterschriebenen Fassung (ohne Strich-Daten): Vorlage, Angaben, Auswahl, Parteien
  const content = { ...data, signatures: signatures.map((x) => ({ role: x.role, name: x.name, signedAt: x.signedAt })) };
  const versionHash = sha256(canonicalJson({ id: doc.id, kind: doc.kind, templateVersion: doc.templateVersion, title: doc.title, clientId: doc.clientId, content }));
  const meta = await requestMeta();
  const proof: SignProof = {
    versionHash,
    serverTime: now,
    ip: meta.ip,
    userAgent: meta.userAgent,
    place: p.place?.trim() || undefined,
    capturedBy: user.name,
    signatures,
  };
  const main = signatures.find((x) => x.role !== "scm") ?? signatures[0];
  const next: Doc = { ...doc, data, status: "unterschrieben", signerName, signedAt: new Date(now), signature: main.strokes, signMeta: { ip: meta.ip, userAgent: meta.userAgent, serverTime: now, versionHash, place: proof.place } };
  const client = await loadClient(doc.clientId);
  try {
    const pdf = await renderDocument(await buildRenderCtx(next, client, proof));
    const file = await putFile({ bucket: "dokumente", name: pdfFileName(doc).replace(/\.pdf$/, "-unterschrieben.pdf"), mime: "application/pdf", data: pdf, userId: user.id });
    const db = await getDb();
    await db
      .update(schema.documents)
      .set({
        data: { ...data, proof: { ...proof, signatures: undefined } },
        status: "unterschrieben",
        signerName,
        signedAt: new Date(now),
        signature: main.strokes,
        signMeta: next.signMeta,
        fileId: file.id,
        contentHash: file.sha256,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.documents.id, id), eq(schema.documents.status, "final")));
    await audit(user.id, "document", id, "unterschrieben", { versionHash, fileId: file.id, sha256: file.sha256, signer: signerName });
  } catch (e) {
    console.error("Unterschrift speichern fehlgeschlagen", e);
    return fail(dbError(e));
  }
  refresh();
  return done("Unterschrieben und als PDF abgelegt", { redirectTo: `/dokumente/${id}` });
}

// ------------------------------------------------------------------
// Widerruf einer Einwilligung (Art. 7 Abs. 3 DSGVO)
// ------------------------------------------------------------------
const revokeSchema = z.object({
  revokedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum wählen"),
  note: z.string().max(1000).optional(),
});

export async function revokeConsent(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const doc = await loadDoc(id);
  if (!doc || doc.kind !== "einwilligung") return fail("Einwilligung nicht gefunden.");
  if (doc.status !== "unterschrieben") return fail("Nur unterschriebene Einwilligungen können widerrufen werden. Entwürfe einfach löschen.");
  if (doc.revokedAt) return fail("Der Widerruf ist bereits vermerkt.");
  const r = parseForm(revokeSchema, fd);
  if (!r.success) return r.state;
  if (r.data.revokedOn > todayIso()) return fail("Das Datum liegt in der Zukunft.", { revokedOn: ["Datum liegt in der Zukunft"] });
  const db = await getDb();
  try {
    await db
      .update(schema.documents)
      .set({ revokedAt: berlinDateTime(r.data.revokedOn, "12:00"), revokeNote: r.data.note ?? null, updatedAt: new Date() })
      .where(eq(schema.documents.id, id));
  } catch (e) {
    return fail(dbError(e));
  }
  await audit(user.id, "document", id, "widerrufen", { revokedOn: r.data.revokedOn });
  refresh();
  return done("Widerruf vermerkt. Prüft jetzt die betroffenen Videos.");
}
