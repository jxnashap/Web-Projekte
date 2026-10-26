"use server";
// Anmeldung: Vorschau-Passwort oder Supabase (E-Mail + Passwort + Zwei-Faktor).
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { audit } from "@/lib/audit";
import { authMode } from "@/lib/auth-mode";
import { safeEqual } from "@/lib/crypto";
import { appUrl } from "@/lib/env";
import { createSession, destroySession } from "@/lib/session";

export type LoginState = { error?: string; info?: string; qr?: string; secret?: string; factorId?: string; user?: number; email?: string };

const safeNext = (v: FormDataEntryValue | null) => {
  const n = String(v ?? "/");
  return n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/login") ? n : "/";
};

// Einfache Drossel gegen Durchprobieren: höchstens 10 Versuche je IP in 10 Minuten (pro Instanz, nur in Produktion).
const attempts = new Map<string, number[]>();
async function throttled(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return false; // lokal (QA-Skripte melden sich oft an)
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "lokal";
  const now = Date.now();
  const list = (attempts.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  attempts.set(ip, list);
  if (attempts.size > 2000) attempts.clear();
  return list.length > 10;
}

// ---------------- Vorschau ----------------
export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  if (authMode() !== "preview") return { error: "Bitte mit E-Mail anmelden." };
  if (await throttled()) return { error: "Zu viele Versuche. Bitte in ein paar Minuten noch einmal." };
  const expected = process.env.STUDIO_PREVIEW_PASSWORD ?? (process.env.NODE_ENV === "production" ? "" : "scm-studio");
  const userId = Number(formData.get("user"));
  const password = String(formData.get("password") ?? "");
  if (!expected || !userId || !safeEqual(password, expected)) return { error: "Das Passwort stimmt nicht.", user: userId || undefined };
  const db = await getDb();
  const [u] = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.id, userId));
  if (!u || !u.active) return { error: "Unbekanntes Teammitglied." };
  await createSession(u.id);
  await audit(u.id, "session", null, "login", { mode: "preview" });
  redirect(safeNext(formData.get("next")));
}

// ---------------- Supabase ----------------
const sb = async () => (await import("@/lib/supabase/server")).createSupabaseServer();

export async function loginWithPassword(_: LoginState, formData: FormData): Promise<LoginState> {
  if (await throttled()) return { error: "Zu viele Versuche. Bitte in ein paar Minuten noch einmal." };
  const parsed = z.object({ email: z.email(), password: z.string().min(1) }).safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: "Bitte E-Mail und Passwort eingeben.", email: String(formData.get("email") ?? "") };
  const client = await sb();
  const { error } = await client.auth.signInWithPassword(parsed.data);
  if (error) return { error: "E-Mail oder Passwort stimmt nicht.", email: parsed.data.email };
  redirect(`/login/zwei-faktor?weiter=${encodeURIComponent(safeNext(formData.get("next")))}`);
}

/** Startet die Einrichtung der Zwei-Faktor-App und liefert den QR-Code. */
export async function startMfaEnroll(): Promise<LoginState> {
  const client = await sb();
  const { data: list } = await client.auth.mfa.listFactors();
  for (const f of list?.all ?? []) {
    if (f.factor_type === "totp" && f.status !== "verified") await client.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: `SCM Studio ${new Date().toISOString().slice(0, 10)}` });
  if (error || !data) return { error: "Zwei-Faktor konnte nicht gestartet werden. Bitte neu anmelden." };
  return { qr: data.totp.qr_code, secret: data.totp.secret, factorId: data.id };
}

export async function verifyMfa(_: LoginState, formData: FormData): Promise<LoginState> {
  if (await throttled()) return { error: "Zu viele Versuche. Bitte in ein paar Minuten noch einmal." };
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { error: "Bitte den sechsstelligen Code aus der App eingeben." };
  const client = await sb();
  let factorId = String(formData.get("factorId") ?? "");
  if (!factorId) {
    const { data } = await client.auth.mfa.listFactors();
    factorId = data?.totp?.[0]?.id ?? "";
  }
  if (!factorId) return { error: "Keine Zwei-Faktor-App eingerichtet." };
  const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: "Der Code passt nicht. Uhrzeit am Handy prüfen und neu versuchen." };
  const { data: claims } = await client.auth.getClaims();
  await audit(null, "session", null, "login", { mode: "supabase", sub: claims?.claims?.sub });
  redirect(safeNext(formData.get("next")));
}

export async function requestPasswordReset(_: LoginState, formData: FormData): Promise<LoginState> {
  if (await throttled()) return { error: "Zu viele Versuche. Bitte in ein paar Minuten noch einmal." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.email().safeParse(email).success) return { error: "Bitte eine gültige E-Mail eingeben." };
  const client = await sb();
  await client.auth.resetPasswordForEmail(email, { redirectTo: `${appUrl()}/auth/bestaetigen` });
  // immer gleiche Antwort, damit niemand testen kann, welche Adressen existieren
  return { info: "Wenn die Adresse zum Team gehört, kommt gleich eine E-Mail mit einem Link." };
}

export async function setNewPassword(_: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  if (password.length < 12) return { error: "Bitte mindestens 12 Zeichen verwenden." };
  if (password !== repeat) return { error: "Die beiden Passwörter stimmen nicht überein." };
  const client = await sb();
  const { error } = await client.auth.updateUser({ password });
  if (error) return { error: "Passwort konnte nicht gesetzt werden. Bitte den Link neu anfordern." };
  redirect("/login/zwei-faktor");
}

export async function logout() {
  if (authMode() === "supabase") {
    const client = await sb();
    await client.auth.signOut();
  }
  await destroySession();
  redirect("/login");
}
