// Hashes und Verschlüsselung (nur Server). Tokens von Google/Instagram werden mit AES-256-GCM
// verschlüsselt gespeichert; Schlüssel: TOKEN_ENC_KEY (32 Byte, base64), lokal ein fester Vorschau-Schlüssel.
import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const sha256 = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");

export const randomToken = (bytes = 24) => randomBytes(bytes).toString("base64url");

function key(): Buffer {
  const raw = process.env.TOKEN_ENC_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") throw new Error("TOKEN_ENC_KEY fehlt");
    return createHash("sha256").update("scm-studio-lokale-vorschau").digest();
  }
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("TOKEN_ENC_KEY muss 32 Byte (base64) lang sein");
  return k;
}

/** Ergebnis: "v1.<iv>.<tag>.<daten>" (base64url) */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), enc.toString("base64url")].join(".");
}

export function decrypt(token: string): string {
  const [v, iv, tag, data] = token.split(".");
  if (v !== "v1") throw new Error("Unbekanntes Format");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
