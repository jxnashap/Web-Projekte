// Listenansicht der Anfragen: Tabelle ab Tablet, auf dem Handy nach Stufe gruppierte Karten
// (abgeschlossene eingeklappt). Die Stufe lässt sich in jeder Zeile und auf jeder Karte ändern.
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { packageShort } from "@/lib/crm/labels";
import { dateDe } from "@/lib/format";
import { LEAD_SCORE, LEAD_SOURCES, LEAD_STAGES } from "@/lib/labels";
import { ContactIcons } from "./contact-links";
import { LeadCard, type LeadCardData, NextStep } from "./lead-card";
import { StageSelect } from "./stage-select";

type Row = LeadCardData & { createdAt: Date };

const ref = (l: LeadCardData) => ({ id: l.id, company: l.company, branche: l.branche, packageInterest: l.packageInterest, stage: l.stage });

export function LeadList({ leads, today, only }: { leads: Row[]; today: string; only?: "mobile" }) {
  const open = LEAD_STAGES.filter((s) => s.key !== "gewonnen" && s.key !== "verloren")
    .map((s) => ({ ...s, list: leads.filter((l) => l.stage === s.key) }))
    .filter((g) => g.list.length > 0);
  const closed = leads.filter((l) => l.stage === "gewonnen" || l.stage === "verloren");
  const mobileCard = (l: Row) => (
    <LeadCard key={l.id} lead={l} today={today} stageControl={<StageSelect lead={ref(l)} clientId={l.clientId} label={`Stufe von ${l.company} ändern`} />} />
  );

  return (
    <>
      <div className="grid gap-6 md:hidden">
        {open.map((g) => (
          <section key={g.key} aria-label={`${g.label}: ${g.list.length}`}>
            <h2 className="mb-2 flex items-baseline gap-2 px-1 text-[15px] font-semibold">
              {g.label} <span className="text-[13px] font-normal tabular-nums text-muted">{g.list.length}</span>
            </h2>
            <div className="grid gap-2">{g.list.map(mobileCard)}</div>
          </section>
        ))}
        {closed.length > 0 && (
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-1 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
              <ChevronDown className="size-4 -rotate-90 text-muted transition-transform group-open:rotate-0" aria-hidden />
              Abgeschlossen
              <span className="text-[13px] font-normal text-muted">
                {closed.filter((l) => l.stage === "gewonnen").length} gewonnen · {closed.filter((l) => l.stage === "verloren").length} verloren
              </span>
            </summary>
            <div className="mt-2 grid gap-2">{closed.map(mobileCard)}</div>
          </details>
        )}
      </div>

      {only !== "mobile" && (
        <Card className="hidden overflow-hidden md:block">
          {/* Ziffern nur in Zahlenspalten gleich breit, sonst wirken Bindestriche wie Gedankenstriche */}
          <Table style={{ fontVariantNumeric: "normal" }}>
            <thead>
              <tr>
                <Th className="w-12">
                  <span className="sr-only">Bewertung</span>
                </Th>
                <Th>Betrieb</Th>
                <Th className="w-44">Stufe</Th>
                <Th>Nächster Schritt</Th>
                <Th className="hidden lg:table-cell">Quelle</Th>
                <Th className="hidden 2xl:table-cell">Eingang</Th>
                <Th className="text-right">Kontakt</Th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="transition-colors hover:bg-fill-2">
                  <Td>{l.score ? <Badge tone={LEAD_SCORE[l.score]?.tone}>{l.score}</Badge> : <span className="text-muted" aria-label="nicht bewertet">·</span>}</Td>
                  <Td className="max-w-72">
                    <Link href={`/anfragen/${l.id}`} className="block truncate font-semibold hover:underline">
                      {l.company}
                    </Link>
                    <div className="truncate text-[13px] text-muted">
                      {[l.name !== l.company ? l.name : null, l.ort, packageShort(l.packageInterest)].filter(Boolean).join(" · ")}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <StageSelect lead={ref(l)} clientId={l.clientId} label={`Stufe von ${l.company} ändern`} className="min-w-40" />
                  </Td>
                  <Td className="max-w-72">
                    {l.stage === "verloren" ? (
                      <span className="line-clamp-2 text-[13px] text-muted">{l.lostReason ? `Grund: ${l.lostReason}` : "Ohne Grund"}</span>
                    ) : l.clientId ? (
                      <span className="text-[13px] text-muted">{l.clientName}</span>
                    ) : (
                      <NextStep step={l.nextStep} at={l.nextStepAt} today={today} />
                    )}
                  </Td>
                  <Td className="hidden whitespace-nowrap text-[13px] text-ink-2 lg:table-cell">{LEAD_SOURCES[l.source] ?? l.source}</Td>
                  <Td className="hidden whitespace-nowrap text-[13px] tabular-nums text-muted 2xl:table-cell">{dateDe(l.createdAt)}</Td>
                  <Td>
                    <ContactIcons phone={l.phone} email={l.email} name={l.name} preferred={l.contactWay} className="justify-end" />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
