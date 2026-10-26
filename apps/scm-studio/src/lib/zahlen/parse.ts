// Zahlen und Datumswerte aus Eingaben und CSV lesen (deutsch und englisch geschrieben).

/** "18.400" | "18,4K" | "18400" | "1.2M" → 18400. Leer → null. Ungültig → NaN. */
export function parseCount(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim().replace(/\s| /g, "");
  if (!s || s === "-" ) return null;
  const m = s.match(/^([\d.,]+)([kKmM]|Tsd\.?|Mio\.?)?$/);
  if (!m) return Number.NaN;
  s = m[1];
  const unit = (m[2] ?? "").toLowerCase();
  const mult = unit.startsWith("k") || unit.startsWith("tsd") ? 1000 : unit.startsWith("m") ? 1_000_000 : 1;
  let value: number;
  if (mult > 1) {
    value = Number(s.replace(",", "."));
  } else if (/^\d{1,3}([.,]\d{3})+$/.test(s)) {
    value = Number(s.replace(/[.,]/g, ""));
  } else {
    value = Number(s.replace(",", "."));
  }
  if (!Number.isFinite(value) || value < 0) return Number.NaN;
  return Math.round(value * mult);
}

/** Sekunden mit Komma oder Punkt, auch "0:12" → 12. Leer → null. */
export function parseSeconds(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const mmss = s.match(/^(\d+):(\d{1,2})$/);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  const v = Number(s.replace(",", ".").replace(/s$/i, ""));
  return Number.isFinite(v) && v >= 0 ? Math.round(v * 10) / 10 : Number.NaN;
}

/** "2026-10-23", "23.10.2026", "23.10.26", "2026-10-23T08:00:00+0000" → "2026-10-23"; sonst null */
export function parseDay(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return valid(`${m[1]}-${m[2]}-${m[3]}`);
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return valid(`${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`);
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // US-Export: MM/DD/YYYY
  if (m) return valid(`${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`);
  return null;
}

function valid(iso: string): string | null {
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null;
}

/** Instagram-Kurzcode aus einem Link (/reel/ABC/, /p/ABC/, /tv/ABC/) oder TikTok-Video-ID. */
export function mediaKey(url: string | null | undefined): string | null {
  if (!url) return null;
  const ig = url.match(/instagram\.com\/(?:[\w.]+\/)?(?:reel|reels|p|tv)\/([\w-]+)/i);
  if (ig) return `ig:${ig[1]}`;
  const tt = url.match(/tiktok\.com\/.*\/video\/(\d+)/i);
  if (tt) return `tt:${tt[1]}`;
  return null;
}

export const normTitle = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9äöüß ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
