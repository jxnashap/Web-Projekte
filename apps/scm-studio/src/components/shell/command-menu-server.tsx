import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { CommandMenu } from "./command-menu";

export async function CommandMenuServer() {
  await requireUser();
  const db = await getDb();
  const clients = await db.select({ id: schema.clients.id, name: schema.clients.name }).from(schema.clients).orderBy(asc(schema.clients.name));
  return <CommandMenu clients={clients} />;
}
