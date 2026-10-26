// Direkte Kontaktwege: Anrufen, WhatsApp, E-Mail (und optional Instagram/Website).
import { AtSign, Globe, Mail, MessageCircle, Music2, Phone } from "lucide-react";
import { cn } from "@/lib/cn";
import { hasPhone, igHref, mailHref, telHref, tiktokHref, waHref, webHref } from "@/lib/crm/labels";

// Gefüllte Rundknöpfe ohne Rahmen; auf dem Handy 44 px. Der bevorzugte Kontaktweg ist blau hervorgehoben.
const iconBtn =
  "grid size-11 shrink-0 place-items-center rounded-full bg-fill text-ink-2 transition-colors hover:bg-[rgb(120_120_128/0.2)] hover:text-ink sm:size-9";
const preferredBtn = "bg-info-soft text-info hover:bg-[#d6e6f8] hover:text-info";

/** Kompakte Rund-Knöpfe (Karten, Listen). */
export function ContactIcons({
  phone,
  email,
  name,
  preferred,
  className,
}: {
  phone?: string | null;
  email?: string | null;
  name: string;
  preferred?: string | null;
  className?: string;
}) {
  const pref = (way: string) => preferred === way;
  const note = (way: string) => (pref(way) ? " (bevorzugt)" : "");
  if (!hasPhone(phone) && !email) return null;
  return (
    <span className={cn("flex items-center gap-2", className)}>
      {hasPhone(phone) && (
        <a href={telHref(phone)} className={cn(iconBtn, pref("anruf") && preferredBtn)} aria-label={`${name} anrufen${note("anruf")}`} title={`Anrufen${note("anruf")}`}>
          <Phone className="size-4" />
        </a>
      )}
      {hasPhone(phone) && (
        <a
          href={waHref(phone)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(iconBtn, pref("whatsapp") && preferredBtn)}
          aria-label={`${name} per WhatsApp schreiben${note("whatsapp")}`}
          title={`WhatsApp${note("whatsapp")}`}
        >
          <MessageCircle className="size-4" />
        </a>
      )}
      {email && (
        <a href={mailHref(email)} className={cn(iconBtn, pref("mail") && preferredBtn)} aria-label={`${name} eine E-Mail schreiben${note("mail")}`} title={`E-Mail${note("mail")}`}>
          <Mail className="size-4" />
        </a>
      )}
    </span>
  );
}

const rowLink = "flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] text-ink transition-colors hover:bg-fill-2 sm:text-[14px]";

/** Ausführliche Liste mit Text (Detailseiten). */
export function ContactList({
  phone,
  email,
  instagram,
  tiktok,
  website,
  preferred,
}: {
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  website?: string | null;
  preferred?: string | null;
}) {
  const pref = (way: string) => (preferred === way ? <span className="ml-auto shrink-0 text-[12px] font-medium text-muted">bevorzugt</span> : null);
  const empty = !hasPhone(phone) && !email && !instagram && !tiktok && !website;
  return (
    <div className="grid gap-0.5">
      {hasPhone(phone) && (
        <a href={telHref(phone)} className={rowLink}>
          <Phone className="size-4 shrink-0 text-muted" /> <span className="tabular-nums">{phone}</span> {pref("anruf")}
        </a>
      )}
      {hasPhone(phone) && (
        <a href={waHref(phone)} target="_blank" rel="noopener noreferrer" className={rowLink}>
          <MessageCircle className="size-4 shrink-0 text-muted" /> WhatsApp schreiben {pref("whatsapp")}
        </a>
      )}
      {email && (
        <a href={mailHref(email)} className={cn(rowLink, "break-all")}>
          <Mail className="size-4 shrink-0 text-muted" /> {email} {pref("mail")}
        </a>
      )}
      {instagram && (
        <a href={igHref(instagram)} target="_blank" rel="noopener noreferrer" className={rowLink}>
          <AtSign className="size-4 text-muted" /> {instagram.replace(/^@/, "")}
        </a>
      )}
      {tiktok && (
        <a href={tiktokHref(tiktok)} target="_blank" rel="noopener noreferrer" className={rowLink}>
          <Music2 className="size-4 text-muted" /> TikTok: {tiktok.replace(/^@/, "")}
        </a>
      )}
      {website && (
        <a href={webHref(website)} target="_blank" rel="noopener noreferrer" className={cn(rowLink, "break-all")}>
          <Globe className="size-4 shrink-0 text-muted" /> {website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
        </a>
      )}
      {empty && <p className="px-3 py-2 text-[14px] text-muted">Noch keine Kontaktdaten hinterlegt.</p>}
    </div>
  );
}
