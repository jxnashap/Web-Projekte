import { asc, desc, eq, notInArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { CommandMenu, type CommandEntry } from "./command-menu";

/** Lädt die Einträge für die Suche (⌘K): Kunden, offene Anfragen, Videos, Rechnungen, Skripte, Dokumente. */
export async function CommandMenuServer() {
  await requireUser();
  const db = await getDb();
  const s = schema;
  const [clients, leads, videos, invoices, scripts, docs] = await Promise.all([
    db.select({ id: s.clients.id, name: s.clients.name, ort: s.clients.ort }).from(s.clients).orderBy(asc(s.clients.name)),
    db
      .select({ id: s.leads.id, company: s.leads.company, name: s.leads.name })
      .from(s.leads)
      .where(notInArray(s.leads.stage, ["gewonnen", "verloren"]))
      .orderBy(desc(s.leads.createdAt))
      .limit(60),
    db
      .select({ id: s.videos.id, title: s.videos.title, client: s.clients.name })
      .from(s.videos)
      .innerJoin(s.clients, eq(s.videos.clientId, s.clients.id))
      .orderBy(desc(s.videos.updatedAt))
      .limit(80),
    db
      .select({ id: s.invoices.id, kind: s.invoices.kind, number: s.invoices.number, title: s.invoices.title, client: s.clients.name })
      .from(s.invoices)
      .leftJoin(s.clients, eq(s.invoices.clientId, s.clients.id))
      .orderBy(desc(s.invoices.createdAt))
      .limit(60),
    db.select({ id: s.scripts.id, title: s.scripts.title }).from(s.scripts).orderBy(desc(s.scripts.updatedAt)).limit(60),
    db.select({ id: s.documents.id, title: s.documents.title, kind: s.documents.kind }).from(s.documents).orderBy(desc(s.documents.updatedAt)).limit(60),
  ]);

  const KIND: Record<string, string> = { rechnung: "Rechnung", angebot: "Angebot", storno: "Storno" };
  const entries: CommandEntry[] = [
    ...clients.map((c) => ({ group: "Kunden", label: c.name, sub: c.ort ?? undefined, href: `/kunden/${c.id}`, type: "kunde" as const })),
    ...leads.map((l) => ({ group: "Anfragen", label: l.company, sub: l.name, href: `/anfragen/${l.id}`, type: "anfrage" as const })),
    ...videos.map((v) => ({ group: "Videos", label: v.title, sub: v.client, href: `/produktion/${v.id}`, type: "video" as const })),
    ...invoices.map((i) => ({
      group: "Rechnungen und Angebote",
      label: i.number ? `${i.number} · ${i.client ?? i.title}` : `${KIND[i.kind] ?? "Beleg"}-Entwurf · ${i.client ?? i.title}`,
      sub: KIND[i.kind],
      href: `/finanzen/rechnungen/${i.id}`,
      type: "rechnung" as const,
    })),
    ...scripts.map((x) => ({ group: "Skripte", label: x.title, href: `/skripte/${x.id}`, type: "skript" as const })),
    ...docs.map((d) => ({ group: "Dokumente", label: d.title, href: `/dokumente/${d.id}`, type: "dokument" as const })),
  ];
  return <CommandMenu entries={entries} />;
}
