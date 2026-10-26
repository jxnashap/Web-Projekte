// Öffentlich: Rückkehr von Instagram. Prüft state + Cookie, speichert den Token verschlüsselt.
import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import { IgError } from "@/lib/instagram/client";
import { igRedirectUri } from "@/lib/instagram/config";
import { completeConnect, readState, STATE_COOKIE } from "@/lib/instagram/connect";
import { syncInstagramAccount } from "@/lib/instagram/sync";


export async function GET(request: Request) {
  const url = new URL(request.url);
  const done = (status: string) => NextResponse.redirect(new URL(`/verbinden/danke?status=${status}`, request.url));
  const jar = await cookies();
  const nonce = jar.get(STATE_COOKIE)?.value;
  jar.delete({ name: STATE_COOKIE, path: "/api/instagram" });

  const parsed = readState(url.searchParams.get("state") ?? "", nonce);
  if (!parsed) return done("abgelaufen");
  if (url.searchParams.get("error")) return done("abgebrochen");
  const code = url.searchParams.get("code");
  if (!code) return done("fehler");

  try {
    const r = await completeConnect(parsed.token, code, igRedirectUri(url.origin));
    after(() => syncInstagramAccount(r.accountId).catch((e) => console.error("Erster Instagram-Abgleich fehlgeschlagen", e)));
    return done("ok");
  } catch (e) {
    console.error("Instagram-Verbindung fehlgeschlagen", e instanceof IgError ? `${e.code} ${e.message}` : e);
    return done(e instanceof Error && e.message === "Link abgelaufen" ? "abgelaufen" : "fehler");
  }
}
