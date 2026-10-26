// Instagram API with Instagram Login (Business- oder Creator-Konto der Kunden).
// Laut Recherche (Stand 10/2026): graph.instagram.com, Scopes instagram_business_basic +
// instagram_business_manage_insights, Long-lived Token 60 Tage, Verlängerung per ig_refresh_token.
import "server-only";
import { appUrl } from "@/lib/env";

export const IG_API_VERSION = "v25.0";
export const IG_GRAPH = "https://graph.instagram.com";
export const IG_AUTHORIZE = "https://www.instagram.com/oauth/authorize";
export const IG_TOKEN = "https://api.instagram.com/oauth/access_token";
export const IG_SCOPES = ["instagram_business_basic", "instagram_business_manage_insights"];

/** Kennzahlen je Medientyp (plays/impressions sind seit April 2025 abgeschaltet) */
export const IG_REEL_METRICS = ["views", "reach", "likes", "comments", "saved", "shares", "total_interactions", "ig_reels_avg_watch_time", "ig_reels_video_view_total_time"];
export const IG_FEED_METRICS = ["views", "reach", "likes", "comments", "saved", "shares", "total_interactions"];

/** Weiterleitungsadresse; in der Meta-App unter "Instagram Login" als gültige OAuth-Redirect-URI eintragen. */
export const igRedirectUri = (origin?: string) =>
  `${process.env.APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || !origin ? appUrl() : origin}/api/instagram/callback`;
