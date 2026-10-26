// Optimistischer Login-Check vor jeder Seite. Die echte Prüfung passiert im Data Access Layer
// (src/lib/auth.ts) bei jedem Datenzugriff. Mit Supabase erneuert der Proxy zusätzlich die Sitzung.
import { NextResponse, type NextRequest } from "next/server";
import { authMode } from "@/lib/auth-mode";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

// Öffentlich (eigene Prüfung im Route Handler): Website-Anfragen per Geheimnis, Kalender-Abo per Token,
// Cron per CRON_SECRET, Instagram-Verbindung der Kunden per signiertem Link, Links aus Supabase-E-Mails.
const PUBLIC = ["/login", "/auth/", "/api/kalender/feed", "/api/anfragen/eingang", "/api/cron/", "/api/instagram/callback", "/verbinden/"];

function toLogin(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = new URL("/login", request.url);
  if (pathname !== "/") url.searchParams.set("weiter", pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  if (authMode() === "supabase") {
    const { response, signedIn } = await updateSupabaseSession(request);
    if (!signedIn && !isPublic) return toLogin(request);
    return response;
  }

  if (isPublic) return NextResponse.next();
  if (!request.cookies.has("scm_session")) return toLogin(request);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|icon.svg|apple-icon.png|manifest.webmanifest|brand/|logo-dark.svg|fonts/).*)"],
};
