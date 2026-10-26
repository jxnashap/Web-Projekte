// Kleine Übersicht: KI-Modus, Modell und Kosten im laufenden Monat.
import Link from "next/link";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { monthLabel, num } from "@/lib/format";
import { getAiUsage } from "@/lib/skripte/data";
import { modelLabel, PRICES_CHECKED_ON } from "@/lib/skripte/pricing";
import { monthIso } from "@/lib/time";

const usd = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "USD", maximumFractionDigits: n < 1 ? 3 : 2 }).format(n);

export async function AiUsageCard() {
  await connection();
  const u = await getAiUsage();
  return (
    <Card>
      <CardHeader
        title="KI diesen Monat"
        sub={monthLabel(monthIso())}
        action={u.live ? <Badge tone="ok">OpenAI aktiv</Badge> : <Badge tone="warn">Demo-Modus</Badge>}
      />
      <div className="grid gap-4 p-5 text-[14px]">
        {u.live ? (
          <p className="text-[13px] text-muted">
            Modell <span className="font-semibold text-ink">{modelLabel(u.config.model)}</span>, Denkaufwand {u.config.effort}.{" "}
            <Link href="/einstellungen" className="underline underline-offset-2 hover:text-ink">
              Ändern
            </Link>
          </p>
        ) : (
          <p className="text-[13px] text-muted">
            Ohne OpenAI-Schlüssel schreibt ein eingebauter Generator Beispiel-Skripte nach dem Bauplan. Mit Schlüssel (OPENAI_API_KEY) schreibt die KI.
          </p>
        )}
        <dl className="grid grid-cols-3 gap-3">
          <div>
            <dt className="scene-label">Aufrufe</dt>
            <dd className="mt-1 text-[20px] font-bold">{num(u.calls)}</dd>
          </div>
          <div>
            <dt className="scene-label">Tokens</dt>
            <dd className="mt-1 text-[20px] font-bold">{num(u.tokens)}</dd>
          </div>
          <div>
            <dt className="scene-label">Kosten</dt>
            <dd className="mt-1 text-[20px] font-bold">{usd(u.usd)}</dd>
          </div>
        </dl>
        {(u.failed > 0 || u.demoCalls > 0) && (
          <p className="text-[12px] text-muted">
            {u.failed > 0 && <>{num(u.failed)} fehlgeschlagen. </>}
            {u.demoCalls > 0 && <>{num(u.demoCalls)} Demo-Entwürfe (kostenlos).</>}
          </p>
        )}
        <p className="border-t border-line pt-3 text-[11px] leading-relaxed text-faint">
          Geschätzt nach OpenAI-Preisen, Stand {PRICES_CHECKED_ON}. Preise vor dem Livegang prüfen.
          {u.unknownPrice && " Für mindestens ein Modell ist kein Preis hinterlegt."}
        </p>
      </div>
    </Card>
  );
}
