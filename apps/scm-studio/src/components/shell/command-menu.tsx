"use client";
import { Command } from "cmdk";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "./nav";

export type CommandClient = { id: number; name: string };

const NEW_ACTIONS = [
  { label: "Neue Anfrage", href: "/anfragen?neu=1", keywords: ["lead", "interessent"] },
  { label: "Neuer Kunde", href: "/kunden/neu", keywords: ["betrieb", "firma"] },
  { label: "Neue Video-Idee", href: "/produktion?neu=1", keywords: ["reel", "clip"] },
  { label: "Skript mit KI schreiben", href: "/skripte/neu", keywords: ["chatgpt", "drehbuch"] },
  { label: "Neuer Termin", href: "/kalender?neu=1", keywords: ["dreh", "gespräch"] },
  { label: "Neue Rechnung", href: "/finanzen/rechnungen/neu", keywords: ["abrechnung"] },
  { label: "Neues Angebot", href: "/finanzen/rechnungen/neu?art=angebot", keywords: ["kostenvoranschlag"] },
  { label: "Beleg erfassen", href: "/finanzen/ausgaben?neu=1", keywords: ["quittung", "ausgabe", "kassenbon"] },
  { label: "Einwilligung am Set", href: "/dokumente/neu?art=einwilligung", keywords: ["unterschrift", "kug", "dsgvo", "person"] },
  { label: "Neuer Vertrag", href: "/dokumente/neu?art=vertrag", keywords: ["dienstleistungsvertrag", "paket"] },
  { label: "Neues Dokument", href: "/dokumente/neu", keywords: ["drehplan", "monatsbericht", "bericht"] },
];

export function CommandMenu({ clients }: { clients: CommandClient[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-[10px] bg-fill px-3 text-[15px] text-muted transition-colors hover:bg-[rgb(120_120_128/0.16)]"
      >
        <Search className="size-4" strokeWidth={2.2} />
        <span className="flex-1 truncate text-left">Suchen</span>
        <kbd className="hidden rounded-[5px] bg-surface/70 px-1.5 text-[11px] font-medium text-muted shadow-[0_0_0_0.5px_rgb(0_0_0/0.08)] sm:inline">⌘K</kbd>
      </button>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Suche"
        overlayClassName="fixed inset-0 z-50 bg-black/15"
        contentClassName="material-light fixed left-1/2 top-[14vh] z-50 w-[min(680px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-[18px] shadow-[var(--shadow-pop)]"
      >
        <div className="flex items-center gap-3 border-b border-hairline px-5">
          <Search className="size-[22px] shrink-0 text-muted" strokeWidth={2} />
          <Command.Input
            placeholder="Kunde, Bereich oder Aktion"
            className="h-[58px] w-full bg-transparent text-[22px] font-light tracking-[-0.02em] outline-none placeholder:text-faint"
          />
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-8 text-center text-[15px] text-muted">Nichts gefunden.</Command.Empty>
          <Command.Group heading="Neu" className="cmdk-group">
            {NEW_ACTIONS.map((a) => (
              <Command.Item key={a.href} value={a.label} keywords={a.keywords} onSelect={() => go(a.href)} className="cmdk-item">
                <span className="grid size-7 place-items-center rounded-[7px] bg-accent text-white"><Plus className="size-4" strokeWidth={2.4} /></span> {a.label}
              </Command.Item>
            ))}
          </Command.Group>
          {clients.length > 0 && (
            <Command.Group heading="Kunden" className="cmdk-group">
              {clients.map((c) => (
                <Command.Item key={c.id} value={`kunde ${c.name}`} onSelect={() => go(`/kunden/${c.id}`)} className="cmdk-item">
                  <span className="grid size-7 place-items-center rounded-full bg-gradient-to-b from-[#a8a8ad] to-[#86868b] text-[11px] font-semibold text-white">{c.name.slice(0, 1)}</span>
                  {c.name}
                </Command.Item>
              ))}
            </Command.Group>
          )}
          <Command.Group heading="Springen zu" className="cmdk-group">
            {NAV.map(({ href, label, icon: Icon, keywords }) => (
              <Command.Item key={href} value={label} keywords={keywords} onSelect={() => go(href)} className="cmdk-item">
                <span className="grid size-7 place-items-center rounded-[7px] bg-fill"><Icon className="size-4 text-ink-2" /></span> {label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </>
  );
}
