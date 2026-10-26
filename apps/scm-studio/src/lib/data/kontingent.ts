import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type Kontingent = {
  clientId: number;
  name: string;
  color: string;
  soll: number;
  geplant: number;
  fertig: number; // fertig oder online
  online: number;
};

/** Paketkontingent je Kunde für einen Monat (YYYY-MM). Testvideos zählen nicht. */
export async function getKontingente(month: string): Promise<Kontingent[]> {
  const db = await getDb();
  const clients = await db
    .select()
    .from(schema.clients)
    // Testkunden haben kein Kontingent (Testvideos sind kostenlos)
    .where(inArray(schema.clients.status, ["aktiv"]));
  const vids = await db
    .select({ clientId: schema.videos.clientId, status: schema.videos.status })
    .from(schema.videos)
    .where(and(eq(schema.videos.month, month), eq(schema.videos.isTest, false)));
  return clients
    .filter((c) => c.packageVideos)
    .map((c) => {
      const mine = vids.filter((v) => v.clientId === c.id);
      return {
        clientId: c.id,
        name: c.name,
        color: c.color,
        soll: c.packageVideos ?? 0,
        geplant: mine.length,
        fertig: mine.filter((v) => v.status === "fertig" || v.status === "online").length,
        online: mine.filter((v) => v.status === "online").length,
      };
    })
    .sort((a, b) => a.fertig / a.soll - b.fertig / b.soll);
}
