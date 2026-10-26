// Kleine Übersicht: KI-Modus, Modell und Kosten im laufenden Monat. Ohne Technik-Begriffe im Text.
import Link from "next/link";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { monthLabel, num } from "@/lib/format";
import { getAiUsage } from "@/lib/skripte/data";
import { modelLabel, PRICES_CHECKED_ON } from "@/lib/skripte/pricing";
import { monthIso } from "@/lib/time";

const EFFORT_LABEL: Record<string, string> = { none: "aus", low: "niedrig", medium: "mittel", high: "hoch" };
const usd = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "USD", maximumFractionDigits: n < 1 ? 3 : 2 }).format(n);

export async function AiUsageCard() {
  await connection();
  const u = await getAiUsage();
  const drafts = u.calls + u.demoCalls;
  return (
    <Card>
      <CardHeader
        title="KI diesen Monat"
        sub={monthLabel(monthIso())}
        action={u.live ? <Badge tone="ok">KI aktiv</Badge> : <Badge tone="warn">Demo-Modus</Badge>}
      />
      <div className="grid gap-4 px-5 pb-5 text-[14px]">
        {u.live ? (
          <p className="text-[14px] text-muted">
            Modell <span className="font-semibold text-ink">{modelLabel(u.config.model)}</span>, Denkaufwand {EFFORT_LABEL[u.config.effort] ?? u.config.effort}.{" "}
            <Link href="/einstellungen?reiter=ki" className="font-semibold text-accent-ink hover:underline">
              Ändern
            </Link>
          </p>
        ) : (
          <p className="text-[14px] text-muted">
            Gerade schreibt ein eingebauter Generator Beispiel-Skripte nach dem Bauplan. Für echte KI-Skripte den OpenAI-Schlüssel unter{" "}
            <Link href="/einstellungen?reiter=ki" className="font-semibold text-accent-ink hover:underline">
              Einstellungen, KI
            </Link>{" "}
            eintragen.
          </p>
        )}
        <dl className={u.live ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"}>
          <div>
            <dt className="text-[13px] text-muted">KI-Entwürfe</dt>
            <dd className="mt-1 text-[20px] font-bold tabular-nums">{num(drafts)}</dd>
          </div>
          {u.live && (
            <div>
              <dt className="text-[13px] text-muted">Kosten in US-Dollar</dt>
              <dd className="mt-1 text-[20px] font-bold tabular-nums">{usd(u.usd)}</dd>
            </div>
          )}
        </dl>
        {(u.failed > 0 || u.demoCalls > 0) && (
          <p className="text-[13px] text-muted">
            {u.failed > 0 && <>{num(u.failed)} fehlgeschlagen. </>}
            {u.demoCalls > 0 && <>Davon {num(u.demoCalls)} aus dem Demo-Generator (kostenlos).</>}
          </p>
        )}
        {u.live && (
          <p className="border-t border-hairline pt-3 text-[12px] leading-relaxed text-muted">
            Geschätzt nach den Preisen von OpenAI, Stand {PRICES_CHECKED_ON}. Preise vor dem Livegang prüfen.
            {u.unknownPrice && " Für mindestens ein Modell ist kein Preis hinterlegt."}
          </p>
        )}
      </div>
    </Card>
  );
}
