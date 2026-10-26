// Verbindungslinks für Kunden: SCM erzeugt einen Link (settings "connect:<token>", 7 Tage gültig),
// der Kunde öffnet ihn ohne Login, meldet sich bei Instagram an und gibt die Statistik frei.
// Der OAuth-state ist verschlüsselt (AES-GCM, also fälschungssicher), enthält Token, Nonce und Ablauf
// und wird zusätzlich gegen ein Cookie geprüft.
import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { audit } from "@/lib/audit";
import { decrypt, encrypt, randomToken, safeEqual } from "@/lib/crypto";
import { integrations } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import type { ConnectLink } from "@/lib/zahlen/data";
import { exchangeCode, getProfile, toLongLived } from "./client";
import { IG_SCOPES } from "./config";

export const STATE_COOKIE = "scm_ig_state";
const TOKEN_RE = /^[\w-]{16,64}$/;

export async function getConnectLink(token: string): Promise<(ConnectLink & { clientName: string }) | null> {
  if (!TOKEN_RE.test(token)) return null;
  const link = await getSetting<Omit<ConnectLink, "token"> | null>(`connect:${token}`, null);
  if (!link || link.expiresAt < new Date().toISOString()) return null;
  const db = await getDb();
  const [client] = await db.select({ name: schema.clients.name }).from(schema.clients).where(eq(schema.clients.id, link.clientId));
  if (!client) return null;
  return { token, ...link, clientName: client.name };
}

export function createState(token: string): { state: string; nonce: string } {
  const nonce = randomToken(16);
  const state = encrypt(JSON.stringify({ t: token, n: nonce, exp: Date.now() + 15 * 60_000 }));
  return { state, nonce };
}

export function readState(state: string, cookieNonce: string | undefined): { token: string } | null {
  try {
    const s = JSON.parse(decrypt(state)) as { t: string; n: string; exp: number };
    if (!cookieNonce || !safeEqual(s.n, cookieNonce) || s.exp < Date.now() || !TOKEN_RE.test(s.t)) return null;
    return { token: s.t };
  } catch {
    return null;
  }
}

/** Code tauschen, langlebigen Token speichern, Link verbrauchen. */
export async function completeConnect(token: string, code: string, redirectUri: string) {
  if (!integrations.instagram()) throw new Error("Instagram ist nicht eingerichtet");
  const link = await getConnectLink(token);
  if (!link) throw new Error("Link abgelaufen");
  const short = await exchangeCode(code, redirectUri);
  const long = await toLongLived(short.accessToken);
  const profile = await getProfile(long.accessToken).catch(() => null);
  const externalUserId = profile?.user_id ?? profile?.id ?? short.userId;
  const db = await getDb();
  const values = {
    clientId: link.clientId,
    platform: "instagram",
    username: profile?.username ?? null,
    externalUserId,
    status: "aktiv",
    accessTokenEnc: encrypt(long.accessToken),
    refreshTokenEnc: null,
    tokenExpiresAt: long.expiresAt,
    scopes: short.permissions || IG_SCOPES.join(","),
    connectedAt: new Date(),
  };
  const [existing] = await db
    .select({ id: schema.socialAccounts.id })
    .from(schema.socialAccounts)
    .where(and(eq(schema.socialAccounts.clientId, link.clientId), eq(schema.socialAccounts.platform, "instagram")));
  let accountId: number;
  if (existing) {
    await db.update(schema.socialAccounts).set(values).where(eq(schema.socialAccounts.id, existing.id));
    accountId = existing.id;
  } else {
    const [row] = await db.insert(schema.socialAccounts).values(values).returning({ id: schema.socialAccounts.id });
    accountId = row.id;
  }
  await db.delete(schema.settings).where(eq(schema.settings.key, `connect:${token}`));
  await audit(null, "social_account", accountId, "verbunden", { clientId: link.clientId, username: values.username });
  return { accountId, clientName: link.clientName, username: values.username };
}
