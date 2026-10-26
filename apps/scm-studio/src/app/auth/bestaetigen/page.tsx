// Ziel der Zugangslinks: aus dem Team geteilt (Einstellungen → Team) oder aus Supabase-E-Mails
// ({{ .SiteURL }}/auth/bestaetigen?token_hash={{ .TokenHash }}&type=invite bzw. type=recovery).
// Eingelöst wird der Link erst mit "Weiter": Vorschauen in WhatsApp oder Mailprogrammen rufen die Seite vorher
// auf und würden den einmaligen Link sonst verbrauchen.
import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthCard } from "../../login/auth-card";
import { RedeemForm } from "./redeem-form";

export const metadata: Metadata = { title: "Zugang einrichten" };

type SP = Promise<{ token_hash?: string; type?: string }>;

async function Redeem({ searchParams }: { searchParams: SP }) {
  const { token_hash, type } = await searchParams;
  return <RedeemForm tokenHash={token_hash ?? ""} type={type ?? ""} />;
}

export default function BestaetigenPage({ searchParams }: { searchParams: SP }) {
  return (
    <AuthCard title="Zugang einrichten" intro="Einmal ein eigenes Passwort festlegen und die Zwei-Faktor-Anmeldung einrichten. Dauert zwei Minuten.">
      <Suspense fallback={<Skeleton className="h-11" />}>
        <Redeem searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
