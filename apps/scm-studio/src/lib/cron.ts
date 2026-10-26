// Geplante Aufgaben (Vercel Cron) rufen /api/cron/* mit "Authorization: Bearer <CRON_SECRET>" auf.
import "server-only";
import { safeEqual } from "./crypto";

export function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // lokal ohne Geheimnis erlaubt
  const auth = request.headers.get("authorization") ?? "";
  return safeEqual(auth, `Bearer ${secret}`);
}
