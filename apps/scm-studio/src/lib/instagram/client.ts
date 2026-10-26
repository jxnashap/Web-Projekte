// Aufrufe an Instagram (nur Server). Fehler werden als IgError mit Code geworfen.
import "server-only";
import { IG_API_VERSION, IG_AUTHORIZE, IG_GRAPH, IG_SCOPES, IG_TOKEN } from "./config";

export class IgError extends Error {
  constructor(
    message: string,
    public code?: number,
    public status?: number,
  ) {
    super(message);
  }
  /** Token ungültig oder widerrufen */
  get authFailed() {
    return this.code === 190 || this.status === 401;
  }
}

async function igFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    // keine JSON-Antwort
  }
  if (!res.ok) {
    const err = (data as { error?: { message?: string; code?: number }; error_message?: string } | null) ?? null;
    throw new IgError(err?.error?.message ?? err?.error_message ?? `Instagram antwortet mit ${res.status}`, err?.error?.code, res.status);
  }
  return data as T;
}

export function authorizeUrl(state: string, redirectUri: string) {
  const u = new URL(IG_AUTHORIZE);
  u.searchParams.set("client_id", process.env.INSTAGRAM_APP_ID ?? "");
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", IG_SCOPES.join(","));
  u.searchParams.set("state", state);
  u.searchParams.set("enable_fb_login", "0");
  return u.toString();
}

/** Code → kurzlebiger Token (1 Stunde) */
export async function exchangeCode(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID ?? "",
    client_secret: process.env.INSTAGRAM_APP_SECRET ?? "",
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code: code.replace(/#_$/, ""),
  });
  const data = await igFetch<{ access_token?: string; user_id?: number | string; permissions?: string[] | string; data?: { access_token: string; user_id: string; permissions: string }[] }>(IG_TOKEN, {
    method: "POST",
    body,
  });
  const d = data.data?.[0] ?? data;
  if (!d.access_token) throw new IgError("Kein Token von Instagram erhalten");
  const perms = Array.isArray(d.permissions) ? d.permissions.join(",") : (d.permissions ?? "");
  return { accessToken: d.access_token, userId: String(d.user_id ?? ""), permissions: perms };
}

/** Kurzlebig → langlebig (60 Tage) */
export async function toLongLived(shortToken: string) {
  const u = new URL(`${IG_GRAPH}/access_token`);
  u.searchParams.set("grant_type", "ig_exchange_token");
  u.searchParams.set("client_secret", process.env.INSTAGRAM_APP_SECRET ?? "");
  u.searchParams.set("access_token", shortToken);
  const d = await igFetch<{ access_token: string; expires_in: number }>(u.toString());
  return { accessToken: d.access_token, expiresAt: new Date(Date.now() + d.expires_in * 1000) };
}

/** Langlebigen Token verlängern (ab 24 Stunden Alter, solange gültig) */
export async function refreshLongLived(token: string) {
  const u = new URL(`${IG_GRAPH}/refresh_access_token`);
  u.searchParams.set("grant_type", "ig_refresh_token");
  u.searchParams.set("access_token", token);
  const d = await igFetch<{ access_token: string; expires_in: number }>(u.toString());
  return { accessToken: d.access_token, expiresAt: new Date(Date.now() + d.expires_in * 1000) };
}

export async function getProfile(token: string) {
  const u = new URL(`${IG_GRAPH}/${IG_API_VERSION}/me`);
  u.searchParams.set("fields", "user_id,username,account_type");
  u.searchParams.set("access_token", token);
  return igFetch<{ user_id?: string; id?: string; username?: string; account_type?: string }>(u.toString());
}

export type IgMedia = {
  id: string;
  permalink?: string;
  media_type?: string;
  media_product_type?: string;
  timestamp?: string;
  caption?: string;
  like_count?: number;
  comments_count?: number;
};

/** Medien der letzten Zeit (seitenweise, höchstens maxItems) */
export async function listMedia(token: string, maxItems = 100): Promise<IgMedia[]> {
  const out: IgMedia[] = [];
  let next: string | null = (() => {
    const u = new URL(`${IG_GRAPH}/${IG_API_VERSION}/me/media`);
    u.searchParams.set("fields", "id,permalink,media_type,media_product_type,timestamp,caption,like_count,comments_count");
    u.searchParams.set("limit", "50");
    u.searchParams.set("access_token", token);
    return u.toString();
  })();
  while (next && out.length < maxItems) {
    const page: { data: IgMedia[]; paging?: { next?: string } } = await igFetch(next);
    out.push(...page.data);
    next = page.paging?.next ?? null;
  }
  return out.slice(0, maxItems);
}

/** Insights eines Mediums als { name: wert } */
export async function mediaInsights(token: string, mediaId: string, metrics: string[]): Promise<Record<string, number>> {
  const u = new URL(`${IG_GRAPH}/${IG_API_VERSION}/${mediaId}/insights`);
  u.searchParams.set("metric", metrics.join(","));
  u.searchParams.set("access_token", token);
  const d = await igFetch<{ data: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] }>(u.toString());
  const out: Record<string, number> = {};
  for (const m of d.data ?? []) {
    const v = m.total_value?.value ?? m.values?.[0]?.value;
    if (typeof v === "number") out[m.name] = v;
  }
  return out;
}
