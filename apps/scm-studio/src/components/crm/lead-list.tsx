// Listenansicht der Anfragen: Tabelle ab Tablet, Karten auf dem Handy.
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { packageShort } from "@/lib/crm/labels";
import { dateDe } from "@/lib/format";
import { LEAD_SCORE, LEAD_SOURCES } from "@/lib/labels";
import { ContactIcons } from "./contact-links";
import { LeadCard, type LeadCardData, NextStep } from "./lead-card";
import { StageSelect } from "./stage-select";

export function LeadList({ leads, today }: { leads: (LeadCardData & { createdAt: Date })[]; today: string }) {
  return (
    <>
      <div className="grid gap-2 md:hidden">
        {leads.map((l) => (
          <LeadCard key={l.id} lead={l} today={today} />
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] md:block">
        <Table>
          <thead>
            <tr>
              <Th className="w-12">Bew.</Th>
              <Th>Betrieb</Th>
              <Th>Stufe</Th>
              <Th>Nächster Schritt</Th>
              <Th className="hidden xl:table-cell">Paket</Th>
              <Th className="hidden lg:table-cell">Quelle</Th>
              <Th className="hidden lg:table-cell">Eingang</Th>
              <Th className="text-right">Kontakt</Th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-canvas/60">
                <Td>{l.score ? <Badge tone={LEAD_SCORE[l.score]?.tone}>{l.score}</Badge> : <span className="text-faint">·</span>}</Td>
                <Td className="max-w-64">
                  <Link href={`/anfragen/${l.id}`} className="block truncate font-semibold hover:underline">
                    {l.company}
                  </Link>
                  <div className="truncate text-[13px] text-muted">{[l.name !== l.company ? l.name : null, l.ort].filter(Boolean).join(" · ")}</div>
                </Td>
                <Td>
                  <StageSelect id={l.id} stage={l.stage} label={`Stufe von ${l.company} ändern`} />
                </Td>
                <Td className="max-w-64">
                  {l.stage === "verloren" ? (
                    <span className="text-[13px] text-muted">{l.lostReason ?? "Verloren"}</span>
                  ) : (
                    <NextStep step={l.nextStep} at={l.nextStepAt} today={today} />
                  )}
                </Td>
                <Td className="hidden text-[13px] text-ink-2 xl:table-cell">{packageShort(l.packageInterest)}</Td>
                <Td className="hidden text-[13px] text-ink-2 lg:table-cell">{LEAD_SOURCES[l.source] ?? l.source}</Td>
                <Td className="hidden whitespace-nowrap text-[13px] text-muted lg:table-cell">{dateDe(l.createdAt)}</Td>
                <Td>
                  <ContactIcons phone={l.phone} email={l.email} name={l.name} preferred={l.contactWay} className="justify-end" />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}
