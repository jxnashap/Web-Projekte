import { CalendarPlus, Camera, Clapperboard, FileSignature, Inbox, ReceiptEuro, ScrollText, type LucideIcon } from "lucide-react";

/** Schnellerfassung (Plus-Knopf, "Neu"-Menü, ⌘K): die häufigsten Handgriffe, auch am Set. */
export const QUICK_ACTIONS: { label: string; hint: string; href: string; icon: LucideIcon }[] = [
  { label: "Video-Idee", hint: "Direkt in die Produktion", href: "/produktion?neu=1", icon: Clapperboard },
  { label: "Anfrage", hint: "Anruf oder Nachricht festhalten", href: "/anfragen?neu=1", icon: Inbox },
  { label: "Termin", hint: "Dreh, Gespräch, Abgabe", href: "/kalender?neu=1", icon: CalendarPlus },
  { label: "Beleg fotografieren", hint: "Quittung oder Rechnung", href: "/finanzen/ausgaben?neu=1", icon: Camera },
  { label: "Einwilligung am Set", hint: "Person im Video unterschreibt", href: "/dokumente/neu?art=einwilligung", icon: FileSignature },
  { label: "Skript schreiben", hint: "Mit KI nach dem SCM-Bauplan", href: "/skripte/neu", icon: ScrollText },
  { label: "Rechnung", hint: "Entwurf anlegen", href: "/finanzen/rechnungen/neu", icon: ReceiptEuro },
];
