// Supabase-Client für Server Components, Server Actions und Route Handler (Sitzung in Cookies).
// Nur aktiv, wenn NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY gesetzt sind.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // In Server Components dürfen keine Cookies gesetzt werden; der Proxy erneuert die Sitzung.
        }
      },
    },
  });
}

/** Admin-Client mit geheimem Schlüssel (nur Server): Einladungen, Storage. */
export async function createSupabaseAdmin() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
