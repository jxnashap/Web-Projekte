// Öffentliche Seite für Kunden: Instagram-Statistik für SCM Creatives freigeben.
import { Check, Lock, X } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ContactButton, PublicShell } from "@/components/zahlen/public-shell";
import { buttonClass } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { integrations } from "@/lib/env";
import { dateLong } from "@/lib/format";
import { getConnectLink } from "@/lib/instagram/connect";

// Kundenseite: im Tab steht der Agenturname, nicht der interne Programmname
export const metadata: Metadata = { title: { absolute: "Instagram verbinden · SCM Creatives" }, robots: { index: false, follow: false } };

type Params = Promise<{ token: string }>;

export default function VerbindenPage({ params }: { params: Params }) {
  return (
    <PublicShell>
      <Suspense fallback={<Skeleton className="h-80" />}>
        <Content params={params} />
      </Suspense>
    </PublicShell>
  );
}

async function Content({ params }: { params: Params }) {
  await connection();
  const { token } = await params;
  const link = await getConnectLink(token);
  if (!link)
    return (
      <div className="text-center">
        <h1 className="text-[24px] font-bold tracking-tight">Dieser Link ist nicht mehr gültig</h1>
        <p className="mt-3 text-[15px] text-muted">Verbindungslinks gelten sieben Tage und nur einmal. Schreibt uns kurz, dann schicken wir euch einen neuen.</p>
        <ContactButton subject="Neuer Verbindungslink für Instagram" className="mt-6" />
      </div>
    );
  const ready = integrations.instagram();
  return (
    <div>
      <p className="text-[13px] font-semibold text-accent-ink">Für {link.clientName}</p>
      <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight">Instagram-Statistik freigeben</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        Damit wir euch jeden Monat genaue Zahlen zu euren Videos zeigen können, braucht SCM Creatives Lesezugriff auf die Statistik eures
        Instagram-Kontos. Ihr meldet euch dafür direkt bei Instagram an, euer Passwort sehen wir nie.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <h2 className="text-[14px] font-semibold">Das sehen wir</h2>
          <ul className="mt-2 grid gap-2 text-[14px] text-ink-2">
            {["Profilname und eure Beiträge", "Aufrufe, Reichweite, Likes, Kommentare, Speichern, Teilen", "Wiedergabezeit eurer Reels"].map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-[14px] font-semibold">Das können wir nicht</h2>
          <ul className="mt-2 grid gap-2 text-[14px] text-ink-2">
            {["Nichts posten, ändern oder löschen", "Keine Direktnachrichten lesen", "Euer Passwort sehen"].map((t) => (
              <li key={t} className="flex gap-2">
                <X className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-sunken px-4 py-3 text-[13px] text-ink-2">
        Voraussetzung ist ein professionelles Instagram-Konto (Business oder Creator). Ihr könnt die Freigabe jederzeit in euren
        Instagram-Einstellungen entfernen oder uns kurz Bescheid geben.
      </div>

      {ready ? (
        <a href={`/verbinden/${encodeURIComponent(token)}/start`} className={buttonClass("primary", "md", "mt-7 h-12 w-full text-[15px]")}>
          <Lock className="size-4" aria-hidden /> Weiter zu Instagram
        </a>
      ) : (
        <p role="status" className="mt-7 rounded-xl bg-warn-soft px-4 py-3 text-[14px] text-warn">
          Die Verbindung ist bei uns gerade noch nicht freigeschaltet. Bitte versucht es später noch einmal oder meldet euch bei SCM Creatives.
        </p>
      )}
      <p className="mt-4 text-center text-[12px] text-muted">
        Link gültig bis {dateLong(link.expiresAt)}. Datenschutzhinweise: [PLATZHALTER Link zur Datenschutzerklärung]
      </p>
    </div>
  );
}
