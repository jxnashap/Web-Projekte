import { CalendarPlus, Camera, FileSignature, Inbox, Lightbulb, ReceiptEuro, ScrollText, type LucideIcon } from "lucide-react";

/** Schnellerfassung (Plus-Knopf, "Neu"-Menü, ⌘K): die häufigsten Handgriffe, auch am Set. */
// Farben wie bei iOS-Symbolen: je Art eine eigene, ruhige Farbe (nicht alles in Signalrot)
export const QUICK_ACTIONS: { label: string; hint: string; href: string; icon: LucideIcon; color: string; keywords: string[] }[] = [
  { label: "Video-Idee", hint: "Festhalten unter Ideen & Skripte", href: "/skripte?neu=idee", icon: Lightbulb, color: "#e1251b", keywords: ["reel", "clip", "video", "idee"] },
  { label: "Anfrage", hint: "Anruf oder Nachricht festhalten", href: "/anfragen?neu=1", icon: Inbox, color: "#0a84ff", keywords: ["lead", "interessent"] },
  { label: "Termin", hint: "Dreh, Gespräch, Abgabe", href: "/kalender?neu=1", icon: CalendarPlus, color: "#ff9500", keywords: ["dreh", "gespräch", "kalender"] },
  { label: "Beleg fotografieren", hint: "Quittung oder Rechnung", href: "/finanzen/ausgaben?neu=1", icon: Camera, color: "#34c759", keywords: ["quittung", "ausgabe", "kassenbon"] },
  { label: "Einwilligung am Set", hint: "Person im Video unterschreibt", href: "/dokumente/neu?art=einwilligung", icon: FileSignature, color: "#af52de", keywords: ["unterschrift", "kug", "dsgvo"] },
  { label: "Skript schreiben", hint: "Mit KI nach dem SCM-Bauplan", href: "/skripte/neu", icon: ScrollText, color: "#5856d6", keywords: ["drehbuch", "ki", "chatgpt"] },
  { label: "Rechnung", hint: "Entwurf anlegen", href: "/finanzen/rechnungen/neu", icon: ReceiptEuro, color: "#30b0c7", keywords: ["abrechnung", "angebot"] },
];
