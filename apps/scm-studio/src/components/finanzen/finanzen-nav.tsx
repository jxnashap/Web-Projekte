// Unterbereiche von Finanzen als Reiter. Der aktive Reiter kommt von der Seite (kein usePathname,
// damit die Seiten ohne Client-Laufzeitdaten vorgerendert werden können).
import { LinkTabs } from "@/components/ui/tabs";

const ITEMS = [
  { key: "ueberblick", href: "/finanzen", label: "Überblick" },
  { key: "rechnungen", href: "/finanzen/rechnungen", label: "Rechnungen und Angebote" },
  { key: "ausgaben", href: "/finanzen/ausgaben", label: "Ausgaben" },
  { key: "export", href: "/finanzen/export", label: "Export" },
] as const;

export function FinanzenNav({ active }: { active: (typeof ITEMS)[number]["key"] }) {
  return <LinkTabs className="mb-6" items={ITEMS.map((i) => ({ href: i.href, label: i.label, active: i.key === active }))} />;
}
