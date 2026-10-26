"use client";
// Spotlight-artige Suche (⌘K / Strg+K): Neu-Aktionen, Bereiche und alle wichtigen Einträge.
// Eigene Trefferlogik (Wortanfang vor Teilwort, Name vor Stichwort), damit z. B. "steak" den Kunden findet
// und nicht über ein Stichwort eine Aktion.
import { Command } from "cmdk";
import { FileText, Inbox, LogOut, Plus, ReceiptEuro, ScrollText, Search, Users, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { logout } from "@/app/login/actions";
import { NAV } from "./nav";
import { QUICK_ACTIONS } from "./quick-actions";

export type CommandEntry = {
  group: string;
  label: string;
  sub?: string;
  href: string;
  type: "kunde" | "anfrage" | "video" | "rechnung" | "skript" | "dokument";
};

const MORE_ACTIONS = [
  { label: "Neuer Kunde", href: "/kunden/neu", keywords: ["betrieb", "firma", "kunde"] },
  { label: "Neues Angebot", href: "/finanzen/rechnungen/neu?art=angebot", keywords: ["kostenvoranschlag", "angebot"] },
  { label: "Neuer Vertrag", href: "/dokumente/neu?art=vertrag", keywords: ["dienstleistungsvertrag", "vertrag"] },
  { label: "Neues Dokument", href: "/dokumente/neu", keywords: ["drehplan", "monatsbericht", "bericht"] },
];

const ICONS = { kunde: Users, anfrage: Inbox, video: Video, rechnung: ReceiptEuro, skript: ScrollText, dokument: FileText };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss");

/** Trefferwert 0..1: Anfang > Wortanfang > Teilwort; Stichwörter zählen weniger. */
function score(value: string, search: string, keywords?: string[]) {
  const q = norm(search).trim();
  if (!q) return 1;
  const label = norm(value.split("​")[0]);
  const words = label.split(/[^a-z0-9]+/).filter(Boolean);
  if (label.startsWith(q)) return 1;
  if (words.some((w) => w.startsWith(q))) return 0.9;
  if (q.length >= 3 && label.includes(q)) return 0.7;
  const kw = (keywords ?? []).map(norm);
  if (kw.some((k) => k.startsWith(q))) return 0.5;
  if (q.length >= 4 && kw.some((k) => k.includes(q))) return 0.3;
  return 0;
}

function Glyph({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      aria-hidden
      className="grid size-7 shrink-0 place-items-center rounded-[7px] text-white"
      style={{ background: color ?? "rgb(120 120 128 / 0.16)", color: color ? "#fff" : "var(--color-ink-2)" }}
    >
      {children}
    </span>
  );
}

export function CommandMenu({ entries }: { entries: CommandEntry[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, start] = useTransition();
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Tastenkürzel passend zum System anzeigen (Server: Mac-Schreibweise)
  const isMac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => true,
  );

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

  const change = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setSearch("");
      requestAnimationFrame(() => buttonRef.current?.focus());
    }
  };
  const go = (href: string) => {
    change(false);
    router.push(href);
  };

  const groups = Array.from(new Set(entries.map((e) => e.group)));
  const typing = search.trim().length > 0;
  // Ohne Eingabe nur die vier häufigsten Neu-Aktionen, mit Eingabe alle
  const quick = typing ? QUICK_ACTIONS : QUICK_ACTIONS.slice(0, 4);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => change(true)}
        aria-keyshortcuts="Meta+K Control+K"
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-[10px] bg-fill px-3 text-[15px] text-ink-2 transition-colors hover:bg-[rgb(120_120_128/0.16)]"
      >
        <Search className="size-4 text-muted" strokeWidth={2.2} />
        <span className="flex-1 truncate text-left">Suchen</span>
        <kbd className="hidden rounded-[5px] bg-surface/70 px-1.5 text-[11px] font-medium text-muted shadow-[0_0_0_0.5px_rgb(0_0_0/0.08)] [@media(pointer:fine)]:sm:inline">
          {isMac ? "⌘K" : "Strg K"}
        </kbd>
      </button>
      <Command.Dialog
        open={open}
        onOpenChange={change}
        label="Suche"
        filter={score}
        overlayClassName="fixed inset-0 z-50 bg-black/20"
        contentClassName="fixed left-1/2 top-[12vh] z-50 w-[min(680px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-[18px] bg-white/95 shadow-[var(--shadow-pop)] backdrop-blur-xl"
      >
        <div className="flex items-center gap-3 border-b border-hairline px-5">
          <Search className="size-[22px] shrink-0 text-muted" strokeWidth={2} />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Kunde, Video, Rechnung oder Aktion"
            className="h-[58px] w-full bg-transparent text-[20px] font-normal tracking-[-0.02em] outline-none placeholder:text-muted sm:text-[22px]"
          />
        </div>
        <Command.List className="max-h-[min(60vh,520px)] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-8 text-center text-[15px] text-muted">Nichts gefunden.</Command.Empty>
          <Command.Group heading="Neu" className="cmdk-group">
            {quick.map((a) => (
              <Command.Item key={a.href} value={`${a.label}​neu`} keywords={a.keywords} onSelect={() => go(a.href)} className="cmdk-item">
                <Glyph color={a.color}>
                  <a.icon className="size-4" strokeWidth={2} />
                </Glyph>
                {a.label}
              </Command.Item>
            ))}
            {typing &&
              MORE_ACTIONS.map((a) => (
                <Command.Item key={a.href} value={`${a.label}​neu`} keywords={a.keywords} onSelect={() => go(a.href)} className="cmdk-item">
                  <Glyph>
                    <Plus className="size-4" strokeWidth={2.4} />
                  </Glyph>
                  {a.label}
                </Command.Item>
              ))}
          </Command.Group>
          {groups.map((g) => {
            const list = entries.filter((e) => e.group === g);
            // Ohne Eingabe nur Kunden zeigen (kurz), sonst alles durchsuchen
            if (!typing && g !== "Kunden") return null;
            return (
              <Command.Group key={g} heading={g} className="cmdk-group">
                {list.map((e) => {
                  const Icon = ICONS[e.type];
                  return (
                    <Command.Item key={e.href} value={`${e.label}​${e.href}`} keywords={e.sub ? [e.sub] : undefined} onSelect={() => go(e.href)} className="cmdk-item">
                      <Glyph>
                        <Icon className="size-4" strokeWidth={2} />
                      </Glyph>
                      <span className="min-w-0 flex-1 truncate">{e.label}</span>
                      {e.sub && <span className="hidden shrink-0 text-[13px] text-muted sm:inline">{e.sub}</span>}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            );
          })}
          <Command.Group heading="Springen zu" className="cmdk-group">
            {NAV.map(({ href, label, icon: Icon, keywords }) => (
              <Command.Item key={href} value={`${label}​nav`} keywords={keywords} onSelect={() => go(href)} className="cmdk-item">
                <Glyph>
                  <Icon className="size-4" />
                </Glyph>
                {label}
              </Command.Item>
            ))}
            <Command.Item
              value={"Abmelden​aktion"}
              keywords={["logout", "ausloggen"]}
              onSelect={() => {
                change(false);
                start(() => logout());
              }}
              className="cmdk-item"
            >
              <Glyph>
                <LogOut className="size-4" />
              </Glyph>
              Abmelden
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </>
  );
}
