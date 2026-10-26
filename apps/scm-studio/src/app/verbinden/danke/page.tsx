// Öffentliche Ergebnisseite nach der Instagram-Freigabe.
import { CircleCheck, CircleX } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactButton, PublicShell } from "@/components/zahlen/public-shell";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: { absolute: "Instagram verbinden · SCM Creatives" }, robots: { index: false, follow: false } };

const TEXTS: Record<string, { ok: boolean; title: string; text: string }> = {
  ok: { ok: true, title: "Danke, das hat geklappt", text: "Eure Instagram-Statistik ist jetzt mit SCM Creatives verbunden. Ihr könnt dieses Fenster schließen." },
  abgebrochen: { ok: false, title: "Freigabe abgebrochen", text: "Es wurde nichts verbunden. Ihr könnt den Link aus unserer Nachricht jederzeit noch einmal öffnen." },
  abgelaufen: { ok: false, title: "Link abgelaufen", text: "Der Link war nicht mehr gültig oder die Anmeldung hat zu lange gedauert. Schreibt uns kurz, dann schicken wir einen neuen." },
  fehler: { ok: false, title: "Das hat nicht geklappt", text: "Instagram hat die Freigabe nicht bestätigt. Prüft bitte, ob euer Konto ein Business- oder Creator-Konto ist, und meldet euch bei uns." },
};

export default function DankePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return (
    <PublicShell>
      <Suspense fallback={<Skeleton className="h-40" />}>
        <Result searchParams={searchParams} />
      </Suspense>
    </PublicShell>
  );
}

async function Result({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const t = TEXTS[status ?? ""] ?? TEXTS.fehler;
  const Icon = t.ok ? CircleCheck : CircleX;
  return (
    <div className="text-center">
      <Icon className={t.ok ? "mx-auto size-10 text-ok" : "mx-auto size-10 text-muted"} aria-hidden />
      <h1 className="mt-4 text-[24px] font-bold tracking-tight">{t.title}</h1>
      <p className="mt-3 text-[15px] text-muted">{t.text}</p>
      {!t.ok && <ContactButton subject="Instagram-Freigabe für SCM Creatives" className="mt-6" />}
    </div>
  );
}
