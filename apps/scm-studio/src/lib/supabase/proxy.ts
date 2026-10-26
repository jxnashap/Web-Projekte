// Sitzungs-Erneuerung im Proxy (läuft vor jeder Seite): liest die Supabase-Cookies, erneuert abgelaufene
// Zugangstoken und schreibt die neuen Cookies in die Antwort. Rückgabe: Antwort + ob jemand angemeldet ist.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  // Wichtig: getClaims() prüft das JWT (nicht getSession()).
  const { data } = await supabase.auth.getClaims();
  return { response, signedIn: Boolean(data?.claims?.sub), aal: (data?.claims?.aal as string | undefined) ?? null };
}
