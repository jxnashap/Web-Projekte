// iCalendar (RFC 5545) für das Kalender-Abo. Zeiten in UTC (…Z), ganztägige Termine als DATE.
// Zeilen werden nach 75 Oktetts gefaltet (UTF-8 beachtet), Text wird nach RFC 5545 maskiert.

export type IcsEvent = {
  id: number;
  title: string;
  kind: string;
  kindLabel: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  location: string | null;
  description: string | null;
  updatedAt: Date;
  createdAt: Date;
};

const pad = (n: number) => String(n).padStart(2, "0");

export const icsUtc = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

/** YYYY-MM-DD → YYYYMMDD */
export const icsDate = (iso: string) => iso.replaceAll("-", "");

export const icsEscape = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Faltet eine Inhaltszeile auf höchstens 75 Oktetts je Zeile (Folgezeilen beginnen mit einem Leerzeichen). */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // Folgezeilen: 1 Oktett für das führende Leerzeichen
    if (bytes + b > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += b;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(
  events: IcsEvent[],
  opts: { name: string; host: string; dayOf: (d: Date) => string; now?: Date },
): string {
  const now = opts.now ?? new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SCM Creatives//SCM Studio//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(opts.name)}`,
    "X-WR-TIMEZONE:Europe/Berlin",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:termin-${e.id}-${e.createdAt.getTime().toString(36)}@${opts.host}`);
    lines.push(`DTSTAMP:${icsUtc(now)}`);
    lines.push(`LAST-MODIFIED:${icsUtc(e.updatedAt)}`);
    if (e.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(opts.dayOf(e.startsAt))}`);
      lines.push(`DTEND;VALUE=DATE:${icsDate(opts.dayOf(e.endsAt))}`);
    } else {
      lines.push(`DTSTART:${icsUtc(e.startsAt)}`);
      lines.push(`DTEND:${icsUtc(e.endsAt)}`);
    }
    lines.push(`SUMMARY:${icsEscape(e.title)}`);
    if (e.location) lines.push(`LOCATION:${icsEscape(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${icsEscape(e.description)}`);
    lines.push(`CATEGORIES:${icsEscape(e.kindLabel)}`);
    lines.push("TRANSP:OPAQUE");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
