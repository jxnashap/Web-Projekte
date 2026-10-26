// Demo-Dokumente: Vertragsentwurf (Jens Rohwer Malermeister), eine unterschriebene DEMO-Einwilligung mit
// synthetischen Strichen (erfundene Person „Max Beispiel“), ein Drehplan für den nächsten Dreh der BS Immobiliengruppe
// und ein Monatsbericht für den Vormonat. PDFs rendert die App bei Bedarf (react-pdf lässt sich im Seed nicht laden).
import { createHash } from "node:crypto";
import { subDays } from "date-fns";
import { and, asc, eq, gte } from "drizzle-orm";
import * as s from "../../src/db/schema";
import {
  canonicalJson,
  DEFAULT_CHECKLISTE,
  defaultEinwilligung,
  defaultVertrag,
  LEGAL_TEMPLATE_VERSION,
  REPORT_TEMPLATE_VERSION,
  type PartySnapshot,
  type SignatureEntry,
} from "../../src/lib/dokumente/schema";
import { berlinDateTime, todayIso } from "../../src/lib/time";
import type { SeedPart } from "../seed";

const party = (c: s.Client): PartySnapshot => ({
  name: c.name,
  legalForm: c.legalForm,
  isMerchant: c.isMerchant,
  registerNumber: c.registerNumber,
  street: c.street,
  zip: c.zip,
  city: c.city ?? c.ort,
  vatId: c.vatId,
  signatoryName: c.signatoryName ?? c.contactName,
  signatoryRole: c.signatoryRole,
  email: c.email,
});

/** Synthetische Unterschrift: Wellenlinie mit Schlusstrich, eindeutig keine echte Unterschrift. */
function demoStrokes(seed: number): number[][][] {
  const wave = Array.from({ length: 24 }, (_, i) => [20 + i * 11, Math.round(70 + Math.sin(i / 2 + seed) * 28 + (i % 3) * 3)]);
  return [wave, [[40, 120], [300, 116]]];
}

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(d);

const seed: SeedPart = async (db, { today, prevMonth, team, clients }) => {
  const { maler, jhkp, bs } = clients;
  const [companyRow] = await db.select().from(s.settings).where(eq(s.settings.key, "company"));
  const company = companyRow?.value ?? null;
  const out: string[] = [];

  // 1) Vertragsentwurf
  await db.insert(s.documents).values({
    kind: "vertrag",
    title: `Dienstleistungsvertrag ${maler.name}`,
    clientId: maler.id,
    data: { ...defaultVertrag(maler, todayIso(today)), besonderes: "" },
    status: "entwurf",
    templateVersion: LEGAL_TEMPLATE_VERSION,
  });
  out.push("Vertragsentwurf");

  // 2) Unterschriebene DEMO-Einwilligung (Dreh vor 12 Tagen bei Jan & Hein & Klaas & Pit)
  const day = todayIso(subDays(today, 12));
  const signedAt = berlinDateTime(day, "10:15");
  const base = {
    ...defaultEinwilligung(day),
    personName: "Max Beispiel (Demo)",
    rolle: "mitarbeitend" as const,
    ort: "Kiel, im Restaurant",
    projekt: "Mittagstisch-Sketche für Instagram (DEMO-Eintrag der Vorschau)",
    zwecke: ["aufnahme", "kanaele", "werbung"] as ("aufnahme" | "kanaele" | "werbung" | "portfolio")[],
  };
  const signatures: SignatureEntry[] = [
    { role: "person", label: "Unterschrift der gefilmten Person", name: base.personName, strokes: demoStrokes(1), signedAt: signedAt.toISOString(), byUserId: team[1]?.id ?? null },
  ];
  const data: Record<string, unknown> = {
    ...base,
    zweckeBeiUnterschrift: base.zwecke,
    party: party(jhkp),
    companySnapshot: company,
    signatures,
  };
  const content = { ...data, signatures: signatures.map((x) => ({ role: x.role, name: x.name, signedAt: x.signedAt })) };
  const title = `Einwilligung ${base.personName} · ${day.split("-").reverse().join(".")}`;
  const [inserted] = await db
    .insert(s.documents)
    .values({ kind: "einwilligung", title, clientId: jhkp.id, data: {}, status: "entwurf", templateVersion: LEGAL_TEMPLATE_VERSION })
    .returning({ id: s.documents.id });
  const versionHash = createHash("sha256")
    .update(canonicalJson({ id: inserted.id, kind: "einwilligung", templateVersion: LEGAL_TEMPLATE_VERSION, title, clientId: jhkp.id, content }))
    .digest("hex");
  const proof = { versionHash, serverTime: signedAt.toISOString(), ip: "127.0.0.1 (Demo)", userAgent: "Demo-Daten der Vorschau", place: "Kiel", capturedBy: team[1]?.name ?? null };
  await db
    .update(s.documents)
    .set({
      data: { ...data, proof },
      status: "unterschrieben",
      signerName: base.personName,
      signedAt,
      signature: signatures[0].strokes,
      signMeta: { ip: proof.ip, userAgent: proof.userAgent, serverTime: proof.serverTime, versionHash, place: proof.place },
    })
    .where(eq(s.documents.id, inserted.id));
  out.push("Einwilligung (Demo, unterschrieben)");

  // 3) Drehplan für den nächsten Dreh der BS Immobiliengruppe
  const [ev] = await db
    .select()
    .from(s.events)
    .where(and(eq(s.events.clientId, bs.id), eq(s.events.kind, "dreh"), gte(s.events.startsAt, berlinDateTime(todayIso(today)))))
    .orderBy(asc(s.events.startsAt))
    .limit(1);
  if (ev) {
    const shootDay = todayIso(ev.startsAt);
    await db.insert(s.documents).values({
      kind: "drehplan",
      title: `Drehplan ${bs.name} · ${shootDay.split("-").reverse().join(".")}`,
      clientId: bs.id,
      status: "entwurf",
      templateVersion: REPORT_TEMPLATE_VERSION,
      data: {
        drehtag: shootDay,
        eventId: ev.id,
        ort: ev.location ?? "Kiel",
        treffpunkt: "Vor dem Büro, Parkplatz",
        start: fmt(ev.startsAt),
        ende: fmt(ev.endsAt),
        ansprechpartner: bs.contactName ?? "",
        ansprechpartnerTelefon: "",
        teamIds: team.slice(0, 2).map((t) => t.id),
        zeitplan: [`${fmt(ev.startsAt)} Ankunft und Aufbau`, "09:30 Ortsanalyse Teil 2: Moderation", "11:00 Ein Tag im Büro: Szenen", `${fmt(ev.endsAt)} Abbau`].join("\n"),
        requisiten: "Gimbal\nZwei Funkmikrofone\nAkku-Licht\nSchilder für Entweder oder",
        checkliste: DEFAULT_CHECKLISTE,
        notizen: "Demo-Eintrag der Vorschau.",
      },
    });
    out.push("Drehplan");
  }

  // 4) Monatsbericht Vormonat (Entwurf, Zahlen werden live berechnet)
  const monthName = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${prevMonth}-15T12:00:00Z`));
  await db.insert(s.documents).values({
    kind: "monatsbericht",
    title: `Monatsbericht ${monthName} · ${bs.name}`,
    clientId: bs.id,
    status: "entwurf",
    templateVersion: REPORT_TEMPLATE_VERSION,
    data: {
      month: prevMonth,
      highlights: "Die Ortsanalyse hat am besten funktioniert: viele Kommentare mit Fragen zu Lagen. Daraus machen wir eine feste Serie. (Demo-Text)",
      ausblick: "Im nächsten Monat: Ortsanalyse Teil 2, ein Blick ins Büro und eine Besichtigung im Altbau. (Demo-Text)",
    },
  });
  out.push("Monatsbericht");

  return out.join(", ");
};

export default seed;
