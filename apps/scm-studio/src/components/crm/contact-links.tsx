// Direkte Kontaktwege: Anrufen, WhatsApp, E-Mail (und optional Instagram/Website).
import { AtSign, Globe, Mail, MessageCircle, Phone } from "lucide-react";
import { cn } from "@/lib/cn";
import { hasPhone, igHref, mailHref, telHref, waHref, webHref } from "@/lib/crm/labels";

const iconBtn =
  "grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink-2 transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

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
  const ring = (way: string) => (preferred === way ? "border-ink text-ink" : "");
  if (!hasPhone(phone) && !email) return null;
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {hasPhone(phone) && (
        <a href={telHref(phone)} className={cn(iconBtn, ring("anruf"))} aria-label={`${name} anrufen`} title="Anrufen">
          <Phone className="size-4" />
        </a>
      )}
      {hasPhone(phone) && (
        <a href={waHref(phone)} target="_blank" rel="noopener noreferrer" className={cn(iconBtn, ring("whatsapp"))} aria-label={`${name} per WhatsApp schreiben`} title="WhatsApp">
          <MessageCircle className="size-4" />
        </a>
      )}
      {email && (
        <a href={mailHref(email)} className={cn(iconBtn, ring("mail"))} aria-label={`${name} eine E-Mail schreiben`} title="E-Mail">
          <Mail className="size-4" />
        </a>
      )}
    </div>
  );
}

const rowLink = "flex min-h-11 items-center gap-3 rounded-lg px-3 text-[14px] text-ink-2 transition-colors hover:bg-sunken hover:text-ink";

/** Ausführliche Liste mit Text (Detailseiten). */
export function ContactList({
  phone,
  email,
  instagram,
  website,
  preferred,
}: {
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  website?: string | null;
  preferred?: string | null;
}) {
  const pref = (way: string) => (preferred === way ? <span className="ml-auto text-[12px] text-muted">bevorzugt</span> : null);
  const empty = !hasPhone(phone) && !email && !instagram && !website;
  return (
    <div className="grid gap-0.5">
      {hasPhone(phone) && (
        <a href={telHref(phone)} className={rowLink}>
          <Phone className="size-4 text-muted" /> {phone} {pref("anruf")}
        </a>
      )}
      {hasPhone(phone) && (
        <a href={waHref(phone)} target="_blank" rel="noopener noreferrer" className={rowLink}>
          <MessageCircle className="size-4 text-muted" /> WhatsApp schreiben {pref("whatsapp")}
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
      {website && (
        <a href={webHref(website)} target="_blank" rel="noopener noreferrer" className={cn(rowLink, "break-all")}>
          <Globe className="size-4 shrink-0 text-muted" /> {website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
        </a>
      )}
      {empty && <p className="px-3 py-2 text-[14px] text-muted">Noch keine Kontaktdaten hinterlegt.</p>}
    </div>
  );
}
