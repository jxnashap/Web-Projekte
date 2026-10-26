// Startet die Google-Verbindung (nur angemeldete Teammitglieder).
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { randomToken } from "@/lib/crypto";
import { integrations } from "@/lib/env";
import { GOOGLE_SCOPES, oauthClient } from "@/lib/google/calendar";


export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login?weiter=/kalender", request.url));
  if (!integrations.google()) return NextResponse.redirect(new URL("/kalender?google=nicht-eingerichtet", request.url));
  const state = randomToken(24);
  (await cookies()).set("scm_google_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/google",
    maxAge: 600,
  });
  const url = oauthClient(new URL(request.url).origin).generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: GOOGLE_SCOPES,
    state,
  });
  return NextResponse.redirect(url);
}
