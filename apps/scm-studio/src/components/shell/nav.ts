import {
  CalendarDays,
  ChartColumn,
  Clapperboard,
  FileText,
  Inbox,
  LayoutDashboard,
  ScrollText,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; keywords?: string[] };

export const NAV: NavItem[] = [
  { href: "/", label: "Heute", icon: LayoutDashboard, keywords: ["start", "übersicht", "dashboard"] },
  { href: "/anfragen", label: "Anfragen", icon: Inbox, keywords: ["lead", "interessent", "quiz"] },
  { href: "/kunden", label: "Kunden", icon: Users, keywords: ["betrieb", "firma", "crm"] },
  { href: "/produktion", label: "Produktion", icon: Clapperboard, keywords: ["video", "reel", "clip", "kontingent"] },
  { href: "/skripte", label: "Skripte", icon: ScrollText, keywords: ["drehbuch", "ki", "chatgpt"] },
  { href: "/kalender", label: "Kalender", icon: CalendarDays, keywords: ["termin", "dreh", "google"] },
  { href: "/zahlen", label: "Zahlen", icon: ChartColumn, keywords: ["performance", "aufrufe", "views", "likes"] },
  { href: "/finanzen", label: "Finanzen", icon: Wallet, keywords: ["rechnung", "angebot", "beleg", "buchhaltung", "datev"] },
  { href: "/dokumente", label: "Dokumente", icon: FileText, keywords: ["vertrag", "einwilligung", "drehplan", "bericht"] },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings, keywords: ["firma", "team", "integration"] },
];


export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
