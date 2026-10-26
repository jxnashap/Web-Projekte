"use server";
// Trend-Recherche von Hand starten (läuft nach der Antwort weiter) und die Richtungsbeschreibung speichern.
import { after } from "next/server";
import { refresh } from "next/cache";
import { done, fail, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertAdmin } from "@/lib/auth";
import { integrations } from "@/lib/env";
import { setSetting } from "@/lib/settings";
import { RICHTUNG_LIMITS } from "./richtung";
import { RICHTUNG_KEY, runTrendResearch } from "./trends";

export async function startTrendResearch(): Promise<ActionState> {
  const user = await assertAdmin();
  if (!integrations.openai()) return fail("Für die Recherche fehlt der OpenAI-Schlüssel (OPENAI_API_KEY in Vercel).");
  await audit(user.id, "recherche", null, "gestartet");
  // Die Recherche dauert einige Minuten: im Hintergrund weiterlaufen lassen, die Seite zeigt den Stand
  after(async () => {
    await runTrendResearch({ trigger: "manuell", userId: user.id });
  });
  return done("Recherche gestartet. Das dauert ein paar Minuten, die Vorschläge erscheinen dann hier.");
}

export async function saveRichtung(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertAdmin();
  const beschreibung = String(fd.get("beschreibung") ?? "").trim();
  const stichwoerter = String(fd.get("stichwoerter") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (beschreibung.length < 40) return fail("Bitte die Richtung in ein paar Sätzen beschreiben.", { beschreibung: ["Mindestens ein paar Sätze"] });
  if (beschreibung.length > RICHTUNG_LIMITS.beschreibung) return fail("Die Beschreibung ist zu lang.", { beschreibung: [`Höchstens ${RICHTUNG_LIMITS.beschreibung} Zeichen`] });
  if (stichwoerter.length === 0) return fail("Bitte mindestens einen Suchbegriff angeben.", { stichwoerter: ["Ein Suchbegriff je Zeile"] });
  if (stichwoerter.length > RICHTUNG_LIMITS.stichwoerter) return fail(`Höchstens ${RICHTUNG_LIMITS.stichwoerter} Suchbegriffe.`, { stichwoerter: ["Bitte kürzen"] });
  await setSetting(RICHTUNG_KEY, { beschreibung, stichwoerter: stichwoerter.map((s) => s.slice(0, RICHTUNG_LIMITS.stichwort)) });
  await audit(user.id, "recherche", null, "richtung", { stichwoerter: stichwoerter.length });
  refresh();
  return done("Richtung gespeichert. Sie gilt ab der nächsten Recherche.");
}
