// Optimistischer Login-Check: ohne Sitzungscookie zur Anmeldung. Die echte Prüfung
// passiert im Data Access Layer (src/lib/auth.ts) bei jedem Datenzugriff.
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/api/kalender/feed"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (!request.cookies.has("scm_session")) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("weiter", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|logo-dark.svg|fonts/).*)"],
};
