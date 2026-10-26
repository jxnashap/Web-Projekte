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
  { label: "Neues Dokument", href: "/dokumente/neu", keywords: ["vertrag", "einwilligung", "drehplan"] },
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
        className="flex h-10 w-full max-w-md items-center gap-2 rounded-full border border-line-2 bg-surface px-4 text-[14px] text-muted transition-colors hover:border-faint"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Suchen oder springen …</span>
        <kbd className="hidden rounded border border-line px-1.5 font-mono text-[11px] sm:inline">⌘K</kbd>
      </button>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Suche"
        overlayClassName="fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px]"
        contentClassName="fixed left-1/2 top-[12vh] z-50 w-[min(640px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]"
      >
        <Command.Input
          placeholder="Kunde, Bereich oder Aktion …"
          className="h-14 w-full border-b border-line bg-transparent px-5 text-[15px] outline-none placeholder:text-faint"
        />
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-6 text-sm text-muted">Nichts gefunden.</Command.Empty>
          <Command.Group heading="Neu" className="cmdk-group">
            {NEW_ACTIONS.map((a) => (
              <Command.Item key={a.href} value={a.label} keywords={a.keywords} onSelect={() => go(a.href)} className="cmdk-item">
                <Plus className="size-4 text-accent" /> {a.label}
              </Command.Item>
            ))}
          </Command.Group>
          {clients.length > 0 && (
            <Command.Group heading="Kunden" className="cmdk-group">
              {clients.map((c) => (
                <Command.Item key={c.id} value={`kunde ${c.name}`} onSelect={() => go(`/kunden/${c.id}`)} className="cmdk-item">
                  {c.name}
                </Command.Item>
              ))}
            </Command.Group>
          )}
          <Command.Group heading="Springen zu" className="cmdk-group">
            {NAV.map(({ href, label, icon: Icon, keywords }) => (
              <Command.Item key={href} value={label} keywords={keywords} onSelect={() => go(href)} className="cmdk-item">
                <Icon className="size-4 text-muted" /> {label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </>
  );
}
