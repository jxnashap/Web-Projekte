// Liefert das Logo eines Kunden nur an angemeldete Teammitglieder. Die Adresse trägt den Dateischlüssel (?v=),
// deshalb darf der Browser es lange zwischenspeichern.
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { logoMime, readLogo } from "@/lib/crm/logo";

export async function GET(_: Request, ctx: RouteContext<"/api/kunden/[id]/logo">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Nicht angemeldet", { status: 401 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return new Response("Nicht gefunden", { status: 404 });
  const db = await getDb();
  const [c] = await db.select({ logoPath: schema.clients.logoPath }).from(schema.clients).where(eq(schema.clients.id, id));
  const data = c?.logoPath ? await readLogo(c.logoPath) : null;
  if (!data || !c?.logoPath) return new Response("Kein Logo", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": logoMime(c.logoPath),
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
