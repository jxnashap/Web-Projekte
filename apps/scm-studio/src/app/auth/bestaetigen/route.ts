// Ziel der Links aus Supabase-E-Mails (Einladung, Passwort zurücksetzen). Die E-Mail-Vorlagen in Supabase
// verlinken auf {{ .SiteURL }}/auth/bestaetigen?token_hash={{ .TokenHash }}&type=invite bzw. type=recovery.
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { authMode } from "@/lib/auth-mode";

const ALLOWED: EmailOtpType[] = ["invite", "recovery", "email", "magiclink", "signup", "email_change"];

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  if (authMode() !== "supabase" || !tokenHash || !type || !ALLOWED.includes(type)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const { createSupabaseServer } = await import("@/lib/supabase/server");
  const sb = await createSupabaseServer();
  const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return NextResponse.redirect(new URL("/login?fehler=link", request.url));
  const target = type === "invite" || type === "recovery" ? "/login/passwort-setzen" : "/login/zwei-faktor";
  return NextResponse.redirect(new URL(target, request.url));
}
