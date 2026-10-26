import { Mail } from "lucide-react";
import Image from "next/image";
import { buttonClass } from "@/components/ui/button";
import { getCompany } from "@/lib/settings";

/** Schlichter, heller Rahmen für öffentliche Seiten, die Kunden sehen (ohne Navigation). */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[520px]">
        <div className="mb-8 flex justify-center">
          <Image src="/logo-dark.svg" alt="SCM Creatives" width={128} height={45} priority />
        </div>
        <div className="squircle rounded-[var(--radius-card)] bg-surface p-7 shadow-[var(--shadow-card)] sm:p-9">{children}</div>
        <p className="mt-6 text-center text-[13px] text-muted">SCM Creatives · Social Media Videos aus Kiel und der Lübecker Bucht</p>
      </div>
    </main>
  );
}

/** Kontaktweg für Kunden (E-Mail aus den Firmendaten in den Einstellungen). */
export async function ContactButton({ subject, className }: { subject: string; className?: string }) {
  const company = await getCompany().catch(() => null);
  const email = company?.email?.trim();
  if (!email) return <p className={className}>[PLATZHALTER Kontakt: E-Mail-Adresse in den Einstellungen unter Firma eintragen]</p>;
  return (
    <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}`} className={buttonClass("secondary", "md", className)}>
      <Mail className="size-4" aria-hidden /> E-Mail an SCM Creatives
    </a>
  );
}
