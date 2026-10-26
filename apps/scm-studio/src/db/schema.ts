// Datenmodell SCM Studio (Postgres-Dialekt: läuft lokal mit PGlite und später unverändert auf Supabase).
// Geldbeträge in Cent (integer), Datumswerte als date (YYYY-MM-DD) bzw. timestamptz.
// Alle Tabellen liegen im Schema "studio": Supabase veröffentlicht nur "public" über die REST-API,
// die Daten sind also nur über die Server-Verbindung der App erreichbar. RLS ist zusätzlich an (ohne Policies = kein Zugriff
// für anon/authenticated), die App selbst verbindet sich als Datenbank-Eigentümer.
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const studio = pgSchema("studio");

const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updated = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// ------------------------------------------------------------------
// Team
// ------------------------------------------------------------------
export const teamMembers = studio.table("team_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("team"), // admin | team
  initials: text("initials").notNull(),
  active: boolean("active").notNull().default(true),
  authUserId: text("auth_user_id").unique(), // später: auth.users.id aus Supabase
  createdAt: created(),
}).enableRLS();

// ------------------------------------------------------------------
// Kunden und Anfragen
// ------------------------------------------------------------------
export const clients = studio.table(
  "clients",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    branche: text("branche").notNull().default("unternehmen"), // gastronomie | immobilien | handwerk | unternehmen
    status: text("status").notNull().default("aktiv"), // test | aktiv | pausiert | beendet
    ort: text("ort"),
    street: text("street"),
    zip: text("zip"),
    city: text("city"),
    contactName: text("contact_name"),
    email: text("email"),
    phone: text("phone"),
    vatId: text("vat_id"),
    taxNumber: text("tax_number"),
    // Vertragsangaben: Rechtsform und Kaufmannseigenschaft entscheiden z. B. über Gerichtsstandsklauseln (§ 38 ZPO)
    legalForm: text("legal_form"), // einzelunternehmen | gbr | ek | gmbh | ug | ohg | kg | gmbh_co_kg | ag | verein | sonstige
    isMerchant: boolean("is_merchant").notNull().default(false),
    registerNumber: text("register_number"), // z. B. HRB 12345 KI
    signatoryName: text("signatory_name"),
    signatoryRole: text("signatory_role"),
    buyerReference: text("buyer_reference"), // Käuferreferenz/Leitweg-ID für E-Rechnungen
    website: text("website"),
    instagram: text("instagram"),
    tiktok: text("tiktok"),
    materialUrl: text("material_url"), // Ordner für Rohmaterial (Google Drive, Dropbox), große Dateien liegen dort
    packageVideos: integer("package_videos"), // 4 | 8 | 12
    packagePriceCents: integer("package_price_cents"), // netto pro Monat
    startDate: date("start_date"),
    notes: text("notes"),
    color: text("color").notNull().default("#E1251B"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("clients_status_idx").on(t.status)],
).enableRLS();

export const leads = studio.table(
  "leads",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    company: text("company").notNull(),
    branche: text("branche"),
    ort: text("ort"),
    phone: text("phone"),
    email: text("email"),
    contactWay: text("contact_way"), // anruf | whatsapp | mail
    source: text("source").notNull().default("website"), // website | instagram | empfehlung | sonstiges
    packageInterest: text("package_interest"), // 4 | 8 | 12 | unsicher
    startWish: text("start_wish"),
    message: text("message"),
    answers: jsonb("answers").$type<Record<string, string>>(), // Antworten aus dem Website-Quiz
    lostReason: text("lost_reason"),
    stage: text("stage").notNull().default("neu"), // neu | kontaktiert | kennenlernen | testvideos | angebot | gewonnen | verloren
    score: text("score"), // A | B | C (aus dem Website-Quiz)
    nextStep: text("next_step"),
    nextStepAt: date("next_step_at"),
    notes: text("notes"),
    clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("leads_stage_idx").on(t.stage), index("leads_client_idx").on(t.clientId)],
).enableRLS();

// ------------------------------------------------------------------
// Produktion: Videos, Skripte, Termine
// ------------------------------------------------------------------
export const videos = studio.table(
  "videos",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    format: text("format"),
    // idee | skript | dreh (vor dem Dreh, unter Ideen & Skripte) · gedreht | schnitt | abnahme | fertig | online (Schnitt-Board)
    status: text("status").notNull().default("idee"),
    month: text("month").notNull(), // YYYY-MM, für das Paketkontingent
    isTest: boolean("is_test").notNull().default(false),
    shootDate: date("shoot_date"),
    postDate: date("post_date"),
    platform: text("platform").default("instagram"), // instagram | tiktok | beide
    url: text("url"),
    externalMediaId: text("external_media_id"), // Instagram-Media-ID bzw. TikTok-Video-ID für den Abgleich
    scriptId: integer("script_id"),
    assignee: integer("assignee").references(() => teamMembers.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("videos_client_idx").on(t.clientId), index("videos_month_idx").on(t.month), index("videos_assignee_idx").on(t.assignee)],
).enableRLS();

export type ScriptBeat = { tc: string; label: string; text: string; shot?: string };

export const scripts = studio.table("scripts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  videoId: integer("video_id").references(() => videos.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  format: text("format"),
  hook: text("hook"),
  beats: jsonb("beats").$type<ScriptBeat[]>().notNull().default(sql`'[]'::jsonb`),
  caption: text("caption"),
  cta: text("cta"),
  status: text("status").notNull().default("entwurf"), // entwurf | final
  source: text("source").notNull().default("manuell"), // manuell | ki | demo
  model: text("model"),
  briefing: text("briefing"),
  ideaId: integer("idea_id").references(() => ideas.id, { onDelete: "set null" }),
  createdBy: integer("created_by").references(() => teamMembers.id, { onDelete: "set null" }),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [
  index("scripts_client_idx").on(t.clientId),
  index("scripts_video_idx").on(t.videoId),
  index("scripts_idea_idx").on(t.ideaId),
  index("scripts_created_by_idx").on(t.createdBy),
]).enableRLS();

// ------------------------------------------------------------------
// Video-Ideen und nächtliche Trend-Recherche
// ------------------------------------------------------------------
export type TrendSource = { title: string; url: string };
export type TrendFinding = { title: string; platform: string; summary: string; fit: string; sources: TrendSource[] };

export const trendRuns = studio.table(
  "trend_runs",
  {
    id: serial("id").primaryKey(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    trigger: text("trigger").notNull().default("nacht"), // nacht | manuell
    triggeredBy: integer("triggered_by").references(() => teamMembers.id, { onDelete: "set null" }),
    ok: boolean("ok").notNull().default(false),
    error: text("error"),
    model: text("model"),
    searchCalls: integer("search_calls").notNull().default(0),
    trends: jsonb("trends").$type<TrendFinding[]>().notNull().default(sql`'[]'::jsonb`),
    ideaCount: integer("idea_count").notNull().default(0),
  },
  (t) => [index("trend_runs_started_idx").on(t.startedAt), index("trend_runs_triggered_by_idx").on(t.triggeredBy)],
).enableRLS();

export const ideas = studio.table(
  "ideas",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    hook: text("hook"),
    format: text("format"),
    branche: text("branche"), // passende Branche, wenn kein Kunde feststeht
    status: text("status").notNull().default("offen"), // vorschlag (aus der Recherche, noch nicht gesichtet) | offen | verworfen
    source: text("source").notNull().default("eigene"), // eigene | recherche
    trend: text("trend"), // Name des Trends, auf dem die Idee aufbaut
    sources: jsonb("sources").$type<TrendSource[]>().notNull().default(sql`'[]'::jsonb`),
    runId: integer("run_id").references(() => trendRuns.id, { onDelete: "set null" }),
    videoId: integer("video_id").references(() => videos.id, { onDelete: "set null" }), // eingeplant als Video
    createdBy: integer("created_by").references(() => teamMembers.id, { onDelete: "set null" }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("ideas_client_idx").on(t.clientId),
    index("ideas_status_idx").on(t.status),
    index("ideas_run_idx").on(t.runId),
    index("ideas_video_idx").on(t.videoId),
    index("ideas_created_by_idx").on(t.createdBy),
  ],
).enableRLS();

// ------------------------------------------------------------------
// Schnitt-Material je Kunde (Logos, Schriften, Musik). Eigene Tabelle statt files:
// files ist GoBD-geschützt (nur anfügen), Material darf aber ersetzt und gelöscht werden.
// ------------------------------------------------------------------
export const materials = studio.table(
  "materials",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    folder: text("folder").notNull().default(""), // Unterordner wie hochgeladen, z. B. "Logos/Varianten"
    name: text("name").notNull(),
    path: text("path").notNull().unique(), // Schlüssel in der Ablage
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    createdBy: integer("created_by").references(() => teamMembers.id, { onDelete: "set null" }),
    createdAt: created(),
  },
  (t) => [index("materials_client_idx").on(t.clientId, t.folder), index("materials_created_by_idx").on(t.createdBy)],
).enableRLS();

export const events = studio.table(
  "events",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    kind: text("kind").notNull().default("dreh"), // dreh | gespraech | deadline | intern
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    location: text("location"),
    clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
    leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
    teamIds: jsonb("team_ids").$type<number[]>().notNull().default(sql`'[]'::jsonb`),
    allDay: boolean("all_day").notNull().default(false),
    notes: text("notes"),
    googleEventId: text("google_event_id"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("events_start_idx").on(t.startsAt), index("events_client_idx").on(t.clientId), index("events_lead_idx").on(t.leadId)],
).enableRLS();

// ------------------------------------------------------------------
// Zahlen der Videos (manuell, CSV, später Instagram/TikTok-API)
// ------------------------------------------------------------------
export const videoMetrics = studio.table(
  "video_metrics",
  {
    id: serial("id").primaryKey(),
    videoId: integer("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
    measuredOn: date("measured_on").notNull(),
    views: integer("views").notNull().default(0),
    reach: integer("reach"),
    likes: integer("likes").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    shares: integer("shares"),
    saves: integer("saves"),
    avgWatchSeconds: real("avg_watch_seconds"),
    totalWatchSeconds: real("total_watch_seconds"),
    totalInteractions: integer("total_interactions"),
    extra: jsonb("extra").$type<Record<string, number>>(), // weitere API-Kennzahlen, Namen wie bei Meta/TikTok
    source: text("source").notNull().default("manuell"), // manuell | csv | instagram | tiktok
    createdAt: created(),
  },
  (t) => [uniqueIndex("metrics_video_day_uq").on(t.videoId, t.measuredOn, t.source)],
).enableRLS();

// Verbundene Konten der Kunden (Stufe 2/3: Instagram API with Instagram Login, TikTok Display API).
// Tokens nur verschlüsselt (AES-256-GCM, Schlüssel TOKEN_ENC_KEY), nie an den Browser.
export const socialAccounts = studio.table("social_accounts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(), // instagram | tiktok
  username: text("username"),
  externalUserId: text("external_user_id"),
  status: text("status").notNull().default("nicht_verbunden"), // nicht_verbunden | aktiv | abgelaufen | widerrufen
  accessTokenEnc: text("access_token_enc"),
  refreshTokenEnc: text("refresh_token_enc"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  scopes: text("scopes"),
  connectedAt: timestamp("connected_at", { withTimezone: true }),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: created(),
}, (t) => [index("social_accounts_client_idx").on(t.clientId)]).enableRLS();

// ------------------------------------------------------------------
// Finanzen: Angebote, Rechnungen, Ausgaben (GoBD: festgeschriebene Belege
// werden nie geändert oder gelöscht, Korrektur nur per Storno)
// ------------------------------------------------------------------
export type Party = {
  name: string;
  contact?: string | null;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string;
  vatId?: string | null;
  email?: string | null;
};

export const invoices = studio.table(
  "invoices",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull().default("rechnung"), // rechnung | angebot | storno
    number: text("number"), // wird erst beim Festschreiben vergeben (lückenlos)
    status: text("status").notNull().default("entwurf"), // entwurf | offen | bezahlt | storniert | versendet | angenommen | abgelehnt
    clientId: integer("client_id").references(() => clients.id, { onDelete: "restrict" }),
    recipient: jsonb("recipient").$type<Party>(),
    title: text("title").notNull().default("Rechnung"),
    issueDate: date("issue_date"),
    serviceFrom: date("service_from"),
    serviceTo: date("service_to"),
    dueDate: date("due_date"),
    validUntil: date("valid_until"),
    intro: text("intro"),
    outro: text("outro"),
    netCents: integer("net_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    grossCents: integer("gross_cents").notNull().default(0),
    cancelsId: integer("cancels_id"),
    fromOfferId: integer("from_offer_id"),
    buyerReference: text("buyer_reference"),
    notes: text("notes"), // intern, erscheint nicht auf dem Beleg
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    paidAt: date("paid_at"),
    dunningLevel: integer("dunning_level").notNull().default(0),
    lastDunningAt: date("last_dunning_at"),
    fileId: integer("file_id"), // festgeschriebenes PDF (bei Rechnungen ZUGFeRD), byte-genau abgelegt
    contentHash: text("content_hash"), // SHA-256 über die abgelegte Datei
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("invoices_number_uq").on(t.kind, t.number),
    index("invoices_status_idx").on(t.status),
    index("invoices_client_idx").on(t.clientId),
  ],
).enableRLS();

export const invoiceItems = studio.table("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  description: text("description").notNull(),
  quantity: real("quantity").notNull().default(1),
  unit: text("unit").notNull().default("Stück"),
  unitPriceCents: integer("unit_price_cents").notNull(),
  taxRate: real("tax_rate").notNull().default(19),
}, (t) => [index("invoice_items_invoice_idx").on(t.invoiceId)]).enableRLS();

export const numberSequences = studio.table(
  "number_sequences",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(), // rechnung | angebot | storno
    year: integer("year").notNull(),
    next: integer("next").notNull().default(1),
  },
  (t) => [uniqueIndex("seq_kind_year_uq").on(t.kind, t.year)],
).enableRLS();

export const expenses = studio.table(
  "expenses",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    supplier: text("supplier").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull().default("sonstiges"),
    netCents: integer("net_cents").notNull(),
    taxRate: real("tax_rate").notNull().default(19),
    taxCents: integer("tax_cents").notNull(),
    grossCents: integer("gross_cents").notNull(),
    reverseCharge: boolean("reverse_charge").notNull().default(false),
    supplierInvoiceNo: text("supplier_invoice_no"),
    paymentMethod: text("payment_method"), // ueberweisung | karte | paypal | bar | lastschrift
    paidOn: date("paid_on"),
    clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }), // optional: Kosten einem Kunden zuordnen
    fileId: integer("file_id"), // Beleg (Foto, PDF oder E-Rechnung im Original)
    receiptName: text("receipt_name"),
    notes: text("notes"),
    exportedAt: timestamp("exported_at", { withTimezone: true }), // nach DATEV-Export festgeschrieben
    createdBy: integer("created_by"),
    createdAt: created(),
  },
  (t) => [index("expenses_date_idx").on(t.date), index("expenses_client_idx").on(t.clientId)],
).enableRLS();

// ------------------------------------------------------------------
// Dokumente: Vertrag, Einwilligung, Drehplan, Monatsbericht
// ------------------------------------------------------------------
export const documents = studio.table(
  "documents",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(), // vertrag | einwilligung | drehplan | monatsbericht
    title: text("title").notNull(),
    clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    status: text("status").notNull().default("entwurf"), // entwurf | final | unterschrieben
    signerName: text("signer_name"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    signature: jsonb("signature").$type<number[][][]>(), // nur Strich-Geometrie (keine Zeit/Druck, also keine biometrischen Daten)
    signMeta: jsonb("sign_meta").$type<{ ip?: string; userAgent?: string; serverTime: string; versionHash: string; place?: string }>(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }), // Widerruf einer Einwilligung (Art. 7 Abs. 3 DSGVO)
    revokeNote: text("revoke_note"),
    templateVersion: text("template_version"),
    fileId: integer("file_id"),
    contentHash: text("content_hash"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("documents_kind_idx").on(t.kind), index("documents_client_idx").on(t.clientId)],
).enableRLS();

// ------------------------------------------------------------------
// Dateien (lokal: .data/files, später: privater Supabase-Storage-Bucket)
// ------------------------------------------------------------------
export const files = studio.table("files", {
  id: serial("id").primaryKey(),
  bucket: text("bucket").notNull(), // belege | rechnungen | dokumente
  path: text("path").notNull().unique(),
  name: text("name").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  sha256: text("sha256").notNull(),
  createdBy: integer("created_by"),
  createdAt: created(),
}).enableRLS();

// Protokoll der KI-Aufrufe (Kostenkontrolle; es werden keine Prompts mit Personendaten gespeichert)
export const aiRuns = studio.table("ai_runs", {
  id: serial("id").primaryKey(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  userId: integer("user_id"),
  purpose: text("purpose").notNull(), // skript | hooks | caption | trends
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  cachedTokens: integer("cached_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  reasoningTokens: integer("reasoning_tokens").notNull().default(0),
  searchCalls: integer("search_calls").notNull().default(0), // Websuchen (werden je Aufruf abgerechnet)
  ok: boolean("ok").notNull().default(true),
  error: text("error"),
  scriptId: integer("script_id"),
}).enableRLS();

// ------------------------------------------------------------------
// Einstellungen, Integrationen, Protokoll
// ------------------------------------------------------------------
export const settings = studio.table("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: updated(),
}).enableRLS();

export const auditLog = studio.table(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    userId: integer("user_id"),
    entity: text("entity").notNull(),
    entityId: integer("entity_id"),
    action: text("action").notNull(),
    detail: jsonb("detail").$type<unknown>(),
    hash: text("hash"), // Hash-Kette: sha256(vorheriger Hash + Eintrag), macht nachträgliche Änderungen sichtbar
  },
  (t) => [index("audit_entity_idx").on(t.entity, t.entityId)],
).enableRLS();

export type Client = typeof clients.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Script = typeof scripts.$inferSelect;
export type CalendarEvent = typeof events.$inferSelect;
export type VideoMetric = typeof videoMetrics.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Doc = typeof documents.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type SocialAccount = typeof socialAccounts.$inferSelect;
export type StoredFile = typeof files.$inferSelect;
export type AiRun = typeof aiRuns.$inferSelect;
export type Idea = typeof ideas.$inferSelect;
export type TrendRun = typeof trendRuns.$inferSelect;
export type Material = typeof materials.$inferSelect;
