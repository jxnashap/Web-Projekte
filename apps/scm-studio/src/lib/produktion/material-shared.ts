// Material je Kunde: Regeln, die Browser und Server gleich anwenden (Ordnernamen, Grenzen, Dateien ohne Nutzen).

/** Wie hochgeladen wird: direkt zu Supabase, lokal über die App oder auf dem Testlink (Vercel ohne Supabase). */
export type UploadMode = "supabase" | "local" | "testlink";

const MB = 1024 * 1024;
/**
 * Größte Datei je Weg. Supabase Free erlaubt höchstens 50 MB je Datei. Lokal und auf dem Testlink geht die Datei
 * durch eine Server Action: lokal bis 10 MB je Anfrage (next.config), bei Vercel höchstens 4,5 MB je Anfrage.
 */
export const MAX_MATERIAL_BYTES: Record<UploadMode, number> = { supabase: 50 * MB, local: 9 * MB, testlink: 4 * MB };
export const MAX_FILES_PER_UPLOAD = 300;

const JUNK = /^(\.ds_store|thumbs\.db|desktop\.ini|\._.*|~\$.*)$/i;
/** Systemdateien von macOS und Windows, die beim Ordner-Upload mitkommen. */
export const isJunkFile = (name: string) => JUNK.test(name);

/** Ordnerpfad säubern: ohne Steuerzeichen, ohne "." und "..", höchstens 6 Ebenen. */
export function cleanFolder(raw: string): string {
  return raw
    .replace(/\\/g, "/")
    .split("/")
    .map((p) => p.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 60))
    .filter((p) => p && p !== "." && p !== "..")
    .slice(0, 6)
    .join("/");
}

/** Ordner, in dem eine Datei landet: aktueller Ordner plus Unterordner aus dem hochgeladenen Ordner. */
export function targetFolder(current: string, relativePath: string): string {
  const parts = relativePath.replace(/\\/g, "/").split("/");
  parts.pop(); // Dateiname
  return cleanFolder([current, ...parts].join("/"));
}

export const bytes = (n: number) =>
  n < 1024 ? `${n} B` : n < MB ? `${Math.round(n / 1024)} KB` : `${(n / MB).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`;
