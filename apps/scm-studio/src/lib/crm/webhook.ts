// Eingang von Anfragen aus dem Website-Quiz (webseiten/scm-creatives/api/anfrage.js).
// Felder, Labels und A/B/C-Einstufung entsprechen der Website-Function.
import "server-only";
import { addDays } from "date-fns";
import { and, desc, eq, gte, or } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { audit } from "@/lib/audit";
import { todayIso } from "@/lib/time";
import { quizLabel, scoreFor } from "./labels";

const MAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const MAX_ITEMS = 8;

const val = z.union([z.string().max(4000), z.array(z.string().max(400)).max(MAX_ITEMS), z.number(), z.null()]).optional();

// zusätzliche Felder (z. B. Honeypot "website", Zeitstempel "t") werden toleriert, aber nicht übernommen
export const webhookSchema = z.looseObject({
  name: val, betrieb: val, email: val, telefon: val, kontaktweg: val, branche: val, andere: val, ziel: val,
  paket: val, extras: val, start: val, region: val, ort: val, nachricht: val, quelle: val, utm: val,
});

type Raw = z.infer<typeof webhookSchema>;
type V = Raw[keyof Raw];

const list = (v: V): string[] => ([] as unknown[]).concat(v == null ? [] : v).slice(0, MAX_ITEMS).map(String);
const clean = (v: V, max = 1500) => (Array.isArray(v) ? list(v).join(", ") : v == null ? "" : String(v)).replace(/[\r\n]+/g, " ").trim().slice(0, max);
const one = (v: V) => clean(Array.isArray(v) ? v[0] : v, 40);
const labelList = (k: Parameters<typeof quizLabel>[0], v: V) => list(v).map((x) => quizLabel(k, x) || clean(x, 80)).filter(Boolean).join(", ");

export type LeadFromWebsite = typeof schema.leads.$inferInsert;

/** Website-Daten → Datensatz für studio.leads. Wirft bei fehlenden Pflichtangaben (wie die Website). */
export function mapWebsiteLead(d: Raw, now = new Date()): LeadFromWebsite {
  const name = clean(d.name, 120);
  const email = clean(d.email, 160);
  const tel = clean(d.telefon, 40);
  const weg = one(d.kontaktweg);
  const mailOk = MAIL_RE.test(email);
  const telOk = tel.replace(/\D/g, "").length >= 6;
  const contactOk = weg === "anruf" || weg === "whatsapp" ? telOk : weg === "email" ? mailOk : mailOk || telOk;
  if (name.length < 2 || !contactOk) throw new Error("Bitte Name und je nach Kontaktweg Telefon oder E-Mail angeben.");

  const paket = one(d.paket);
  const start = one(d.start);
  const score = scoreFor(paket, start);
  const branche = one(d.branche);
  const betrieb = clean(d.betrieb, 160);
  const ort = clean(d.ort, 120) || labelList("region", d.region);

  const answers: Record<string, string> = Object.fromEntries(
    (
      [
        ["Branche", labelList("branche", d.branche)],
        ["Andere Branche", clean(d.andere, 160)],
        ["Ziel", labelList("ziel", d.ziel)],
        ["Paket", labelList("paket", d.paket)],
        ["Zusätzlich", labelList("extras", d.extras)],
        ["Start", labelList("start", d.start)],
        ["Region", labelList("region", d.region)],
        ["Ort", clean(d.ort, 120)],
        ["Gewünschter Kontakt", labelList("kontaktweg", d.kontaktweg)],
        ["Kam von Seite", clean(d.quelle, 200)],
        ["Kampagne (utm_source)", clean(d.utm, 80)],
      ] as [string, string][]
    ).filter(([, v]) => v),
  );

  const next = {
    A: { step: "Heute zurückrufen", at: todayIso(now) },
    B: { step: "Innerhalb der zugesagten Antwortzeit melden", at: todayIso(addDays(now, 1)) },
    C: { step: "Infos schicken", at: todayIso(addDays(now, 2)) },
  }[score];

  return {
    name,
    company: betrieb || name,
    branche: ["gastronomie", "immobilien", "handwerk", "unternehmen", "andere"].includes(branche) ? branche : null,
    ort: ort || null,
    phone: telOk ? tel : null,
    email: mailOk ? email : null,
    contactWay: weg === "email" ? "mail" : weg === "anruf" || weg === "whatsapp" ? weg : null,
    source: "website",
    packageInterest: ["4", "8", "12"].includes(paket) ? paket : paket === "offen" ? "unsicher" : null,
    startWish: ["sofort", "1-3", "spaeter"].includes(start) ? start : null,
    stage: "neu",
    score,
    nextStep: next.step,
    nextStepAt: next.at,
    message: clean(d.nachricht) || null,
    answers,
  };
}

/** Legt die Anfrage an. Doppelte Einsendungen (gleiche E-Mail oder Telefonnummer in 10 Minuten) werden zusammengefasst. */
export async function storeWebsiteLead(values: LeadFromWebsite): Promise<{ id: number; duplicate: boolean }> {
  const db = await getDb();
  const since = new Date(Date.now() - 10 * 60 * 1000);
  const same = [values.email ? eq(schema.leads.email, values.email) : null, values.phone ? eq(schema.leads.phone, values.phone) : null].filter(
    (x): x is NonNullable<typeof x> => x !== null,
  );
  if (same.length) {
    const [dup] = await db
      .select({ id: schema.leads.id })
      .from(schema.leads)
      .where(and(gte(schema.leads.createdAt, since), or(...same)))
      .orderBy(desc(schema.leads.id))
      .limit(1);
    if (dup) return { id: dup.id, duplicate: true };
  }
  const [row] = await db.insert(schema.leads).values(values).returning({ id: schema.leads.id });
  await audit(null, "lead", row.id, "eingang_website", { bewertung: values.score });
  return { id: row.id, duplicate: false };
}
