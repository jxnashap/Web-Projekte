// Öffentlich: startet die Instagram-Anmeldung für einen gültigen Verbindungslink.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { integrations } from "@/lib/env";
import { authorizeUrl } from "@/lib/instagram/client";
import { igRedirectUri } from "@/lib/instagram/config";
import { createState, getConnectLink, STATE_COOKIE } from "@/lib/instagram/connect";


export async function GET(request: Request, ctx: RouteContext<"/verbinden/[token]/start">) {
  const { token } = await ctx.params;
  const link = await getConnectLink(token);
  if (!link || !integrations.instagram()) return NextResponse.redirect(new URL(`/verbinden/${encodeURIComponent(token)}`, request.url));
  const { state, nonce } = createState(token);
  (await cookies()).set(STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/instagram",
    maxAge: 15 * 60,
  });
  return NextResponse.redirect(authorizeUrl(state, igRedirectUri(new URL(request.url).origin)));
}
