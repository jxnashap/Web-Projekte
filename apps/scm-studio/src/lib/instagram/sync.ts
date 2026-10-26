// Abgleich verbundener Instagram-Konten: Medien holen, Videos zuordnen (Permalink → externalMediaId),
// Insights als Tagesstand speichern (Quelle "instagram"), Token rechtzeitig verlängern.
import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { todayIso } from "@/lib/time";
import { mediaKey } from "@/lib/zahlen/parse";
import { IgError, listMedia, mediaInsights, refreshLongLived } from "./client";
import { IG_FEED_METRICS, IG_REEL_METRICS } from "./config";

export type SyncResult = { media: number; matched: number; points: number; refreshed: boolean };

/** Token verlängern, wenn er in weniger als 10 Tagen abläuft und mindestens 24 Stunden alt ist. */
async function refreshIfNeeded(account: typeof schema.socialAccounts.$inferSelect): Promise<{ token: string; refreshed: boolean }> {
  const token = decrypt(account.accessTokenEnc!);
  const expires = account.tokenExpiresAt?.getTime() ?? 0;
  const connected = account.connectedAt?.getTime() ?? 0;
  if (expires - Date.now() > 10 * 86_400_000 || Date.now() - connected < 86_400_000) return { token, refreshed: false };
  const fresh = await refreshLongLived(token);
  const db = await getDb();
  await db
    .update(schema.socialAccounts)
    .set({ accessTokenEnc: encrypt(fresh.accessToken), tokenExpiresAt: fresh.expiresAt })
    .where(eq(schema.socialAccounts.id, account.id));
  return { token: fresh.accessToken, refreshed: true };
}

export async function syncInstagramAccount(accountId: number): Promise<SyncResult> {
  const db = await getDb();
  const [account] = await db.select().from(schema.socialAccounts).where(eq(schema.socialAccounts.id, accountId));
  if (!account || account.platform !== "instagram") throw new Error("Konto nicht gefunden");
  if (account.status !== "aktiv" || !account.accessTokenEnc) throw new Error("Konto ist nicht verbunden");

  try {
    const { token, refreshed } = await refreshIfNeeded(account);
    const media = await listMedia(token, 120);
    const videos = await db
      .select({ id: schema.videos.id, url: schema.videos.url, ext: schema.videos.externalMediaId, postDate: schema.videos.postDate })
      .from(schema.videos)
      .where(eq(schema.videos.clientId, account.clientId));
    const byKey = new Map(videos.map((v) => [mediaKey(v.url), v]).filter(([k]) => k) as [string, (typeof videos)[number]][]);
    const byExt = new Map(videos.filter((v) => v.ext).map((v) => [v.ext!, v]));
    const today = todayIso();
    let matched = 0;
    let points = 0;

    for (const m of media) {
      const v = byExt.get(m.id) ?? byKey.get(mediaKey(m.permalink) ?? "");
      if (!v) continue;
      matched++;
      if (v.ext !== m.id || (!v.postDate && m.timestamp)) {
        await db
          .update(schema.videos)
          .set({
            externalMediaId: m.id,
            ...(v.postDate || !m.timestamp ? {} : { postDate: todayIso(new Date(m.timestamp)) }),
            updatedAt: new Date(),
          })
          .where(eq(schema.videos.id, v.id));
      }
      const isReel = m.media_product_type === "REELS";
      let ins: Record<string, number>;
      try {
        ins = await mediaInsights(token, m.id, isReel ? IG_REEL_METRICS : IG_FEED_METRICS);
      } catch (e) {
        if (e instanceof IgError && e.authFailed) throw e;
        // einzelne Kennzahl nicht verfügbar → mit Grundwerten weiter
        ins = await mediaInsights(token, m.id, ["views", "reach", "likes", "comments"]).catch(() => ({}) as Record<string, number>);
      }
      const known = new Set(["views", "reach", "likes", "comments", "saved", "shares", "total_interactions", "ig_reels_avg_watch_time", "ig_reels_video_view_total_time"]);
      const extra = Object.fromEntries(Object.entries(ins).filter(([k]) => !known.has(k)));
      const values = {
        videoId: v.id,
        measuredOn: today,
        views: ins.views ?? 0,
        reach: ins.reach ?? null,
        likes: ins.likes ?? m.like_count ?? 0,
        comments: ins.comments ?? m.comments_count ?? 0,
        shares: ins.shares ?? null,
        saves: ins.saved ?? null,
        totalInteractions: ins.total_interactions ?? null,
        // Instagram liefert Wiedergabezeiten in Millisekunden
        avgWatchSeconds: ins.ig_reels_avg_watch_time != null ? Math.round(ins.ig_reels_avg_watch_time / 100) / 10 : null,
        totalWatchSeconds: ins.ig_reels_video_view_total_time != null ? Math.round(ins.ig_reels_video_view_total_time / 1000) : null,
        extra: Object.keys(extra).length ? extra : null,
        source: "instagram",
      };
      await db
        .insert(schema.videoMetrics)
        .values(values)
        .onConflictDoUpdate({ target: [schema.videoMetrics.videoId, schema.videoMetrics.measuredOn, schema.videoMetrics.source], set: { ...values, createdAt: new Date() } });
      points++;
    }
    await db.update(schema.socialAccounts).set({ lastSyncAt: new Date() }).where(eq(schema.socialAccounts.id, account.id));
    return { media: media.length, matched, points, refreshed };
  } catch (e) {
    if (e instanceof IgError && e.authFailed) {
      await db.update(schema.socialAccounts).set({ status: "abgelaufen" }).where(eq(schema.socialAccounts.id, account.id));
      throw new Error("Instagram-Zugang ist abgelaufen oder wurde widerrufen. Bitte einen neuen Verbindungslink schicken.");
    }
    throw e;
  }
}

/** Für den Cron: alle aktiven Instagram-Konten nacheinander. */
export async function syncAllInstagram() {
  const db = await getDb();
  const accounts = await db
    .select({ id: schema.socialAccounts.id, clientId: schema.socialAccounts.clientId })
    .from(schema.socialAccounts)
    .where(and(eq(schema.socialAccounts.platform, "instagram"), inArray(schema.socialAccounts.status, ["aktiv"])));
  const results: { accountId: number; ok: boolean; result?: SyncResult; error?: string }[] = [];
  for (const a of accounts) {
    try {
      results.push({ accountId: a.id, ok: true, result: await syncInstagramAccount(a.id) });
    } catch (e) {
      results.push({ accountId: a.id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}
