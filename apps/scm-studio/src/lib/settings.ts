import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type Company = {
  brand: string;
  legalName: string;
  owner: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  vatId: string;
  taxNumber: string;
  email: string;
  phone: string;
  web: string;
  bankName: string;
  iban: string;
  bic: string;
  paymentDays: number;
  smallBusiness: boolean;
};

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const db = await getDb();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
  return (row?.value as T) ?? fallback;
}

export async function setSetting(key: string, value: unknown) {
  const db = await getDb();
  await db
    .insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
}

export const getCompany = () => getSetting<Company | null>("company", null);
export const isDemo = () => getSetting<boolean>("demo", false);
