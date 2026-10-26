// Erststart für den echten Betrieb (ohne Demo-Daten): legt Firmendaten und Teammitglieder an.
// Aufruf (mit DATABASE_URL auf Supabase):
//   npm run bootstrap -- "Oskar von Esebeck|oskar@beispiel.de|admin" "Yannick Ruch|yannick@beispiel.de|admin"
// Bestehende Einträge (gleiche E-Mail) bleiben unverändert. Danach die Personen in Supabase einladen.
import { sql } from "drizzle-orm";
import { connect } from "../src/db/connect";
import * as s from "../src/db/schema";

async function main() {
  const db = await connect();
  const people = process.argv.slice(2).map((arg) => {
    const [name, email, role = "team"] = arg.split("|").map((x) => x.trim());
    if (!name || !email?.includes("@")) throw new Error(`Ungültig: "${arg}" (Format "Name|email|admin")`);
    const initials = name.split(/\s+/).filter((w) => /^[A-ZÄÖÜ]/.test(w)).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    return { name, email: email.toLowerCase(), role: role === "admin" ? "admin" : "team", initials: initials || name.slice(0, 2).toUpperCase() };
  });
  if (!people.length) throw new Error("Bitte mindestens ein Teammitglied angeben.");

  for (const p of people) {
    await db.insert(s.teamMembers).values(p).onConflictDoNothing({ target: s.teamMembers.email });
  }
  // Firmendaten laut Impressum der Website; Bank und Steuernummer bitte in der App unter Einstellungen ergänzen.
  await db
    .insert(s.settings)
    .values({
      key: "company",
      value: {
        brand: "SCM Creatives", legalName: "Blacksnapper Consulting", owner: "Andreas Mattolat", street: "Hüttenweg 4", zip: "21516",
        city: "Tramm", country: "DE", vatId: "DE265142237", taxNumber: "", email: "scm.creatives@gmx.de", phone: "0172 5361079",
        web: "scm-creatives.de", bankName: "", iban: "", bic: "", paymentDays: 14, smallBusiness: false,
      },
    })
    .onConflictDoNothing();
  await db.insert(s.settings).values({ key: "demo", value: false }).onConflictDoUpdate({ target: s.settings.key, set: { value: false } });
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.teamMembers);
  console.log(`Fertig. Teammitglieder: ${n}. Demo-Modus aus.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
