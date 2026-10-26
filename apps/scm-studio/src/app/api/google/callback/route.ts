// Rückkehr von Google: state prüfen, Token tauschen, Kalender anlegen, Termine übertragen.
import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { safeEqual } from "@/lib/crypto";
import { completeGoogleConnect, syncUpcoming } from "@/lib/google/calendar";
import { getSetting, setSetting } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (status: string) => NextResponse.redirect(new URL(`/kalender?google=${status}`, request.url));
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login?weiter=/kalender", request.url));

  const jar = await cookies();
  const expected = jar.get("scm_google_state")?.value ?? "";
  jar.delete({ name: "scm_google_state", path: "/api/google" });
  const state = url.searchParams.get("state") ?? "";
  if (!expected || !state || !safeEqual(expected, state)) return back("fehler");
  if (url.searchParams.get("error")) return back("abgebrochen");
  const code = url.searchParams.get("code");
  if (!code) return back("fehler");

  try {
    await completeGoogleConnect(code, user);
    await audit(user.id, "settings", null, "google_verbunden");
    after(() => syncUpcoming());
    return back("verbunden");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Google-Verbindung fehlgeschlagen", message);
    const current = await getSetting<Record<string, unknown> | null>("google", null);
    if (current) await setSetting("google", { ...current, lastError: { at: new Date().toISOString(), message: message.slice(0, 300) } });
    await audit(user.id, "settings", null, "google_fehler", { message: message.slice(0, 300) });
    return back("fehler");
  }
}
