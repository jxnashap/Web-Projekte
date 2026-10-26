// Branchen: die vier festen (Website-Quiz, Referenzen) plus eigene aus den Einstellungen (z. B. Fahrschule).
// Eigene Branchen speichern ihren Namen zugleich als Schlüssel, so zeigen alle Ansichten ihn ohne Nachschlagen an.
import "server-only";
import { getSetting } from "@/lib/settings";
import { BRANCHEN } from "@/lib/labels";

export const BRANCHEN_KEY = "branchen.eigene";

export async function customBranchen(): Promise<string[]> {
  const list = await getSetting<string[]>(BRANCHEN_KEY, []);
  return Array.isArray(list) ? list.filter((b) => typeof b === "string" && b.trim()) : [];
}

/** Alle Branchen als Schlüssel → Anzeigename. */
export async function getBranchen(): Promise<Record<string, string>> {
  const extra = await customBranchen();
  return { ...BRANCHEN, ...Object.fromEntries(extra.map((b) => [b, b])) };
}

export async function isBranche(key: string): Promise<boolean> {
  return key in (await getBranchen());
}
