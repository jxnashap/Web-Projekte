import { AlertTriangle, CheckCircle2, Download, FileArchive, FileSpreadsheet, Info } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { ExportPeriod } from "@/components/finanzen/export-period";
import { DatevSettingsForm, CompleteExportForm } from "@/components/finanzen/export-forms";
import { AmountRow } from "@/components/finanzen/figure";
import { FinanzenNav } from "@/components/finanzen/finanzen-nav";
import { parsePeriod } from "@/components/finanzen/period-nav";
import { buttonClass } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { periodRange } from "@/lib/finanzen/core";
import { defaultExportMonth, getExportOverview } from "@/lib/finanzen/data";
import { dateTime, eur, monthLabel } from "@/lib/format";
import { fileHref } from "@/lib/storage";
import { todayIso } from "@/lib/time";

export const metadata = { title: "Export" };

export default function ExportPage({ searchParams }: PageProps<"/finanzen/export">) {
  return (
    <>
      <PageHeader
        scene="Szene 08 · Finanzen"
        title="Export für die Steuerberatung"
        description="Einmal im Monat: Buchungsstapel im DATEV-Format, Journal und alle Belege als ZIP. Danach sind die Belege festgeschrieben."
      />
      <FinanzenNav active="export" />
      <Suspense fallback={<div className="grid gap-4"><Skeleton className="h-10 w-80" /><Skeleton className="h-64" /></div>}>
        <Export searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Export({ searchParams }: { searchParams: PageProps<"/finanzen/export">["searchParams"] }) {
  await connection();
  const user = await requireUser();
  const sp = await searchParams;
  const { kind, ym } = parsePeriod(sp, defaultExportMonth());
  const p = periodRange(kind, ym);
  const label = p.label || monthLabel(ym);
  const o = await getExportOverview(p.from, p.to);
  const qs = `von=${p.from}&bis=${p.to}&label=${encodeURIComponent(label)}`;
  const open = o.expenses.filter((e) => !e.exportedAt);
  const missing = o.expenses.filter((e) => !e.fileId);
  const sumInv = o.invoices.reduce((s, i) => s + i.grossCents, 0);
  const sumExp = o.expenses.reduce((s, e) => s + e.grossCents, 0);
  const finished = p.to < todayIso();
  const warnings = [
    !o.settings.beraterNr || !o.settings.mandantNr ? "Berater- und Mandantennummer fehlen noch [PLATZHALTER]. Ohne sie kann der Buchungsstapel nicht importiert werden." : null,
    missing.length ? `${missing.length} Ausgaben ohne Belegdatei.` : null,
    o.draftInvoices ? `${o.draftInvoices} Rechnungsentwürfe sind noch nicht festgeschrieben und fehlen im Export.` : null,
    !finished ? "Der Zeitraum läuft noch. Abschließen geht erst, wenn er vorbei ist." : null,
  ].filter(Boolean) as string[];

  return (
    <div className="grid gap-6">
      <ExportPeriod kind={kind} ym={ym} label={label} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title={`Inhalt ${label}`} sub="Festgeschriebene Rechnungen und Stornos nach Rechnungsdatum, Ausgaben nach Belegdatum" />
          <div className="divide-y divide-line px-5 pb-3">
            <AmountRow label={`${o.invoices.length} Rechnungen und Stornos`} value={eur(sumInv)} hint="brutto" />
            <AmountRow label={`${o.expenses.length} Ausgaben`} value={eur(sumExp)} hint={`brutto, davon ${o.expenses.length - open.length} bereits exportiert`} />
          </div>
          <div className="grid gap-2 border-t border-line p-5 sm:grid-cols-3">
            <a className={buttonClass("secondary")} href={`/api/finanzen/export?${qs}&format=extf`} download>
              <FileSpreadsheet className="size-4" /> DATEV (EXTF)
            </a>
            <a className={buttonClass("secondary")} href={`/api/finanzen/export?${qs}&format=journal`} download>
              <Download className="size-4" /> Journal (CSV)
            </a>
            <a className={buttonClass("primary")} href={`/api/finanzen/export?${qs}&format=zip`} download>
              <FileArchive className="size-4" /> Paket (ZIP)
            </a>
          </div>
          <div className="border-t border-line p-5">
            {warnings.length > 0 && (
              <ul className="mb-4 grid gap-2 text-[14px]">
                {warnings.map((w) => (
                  <li key={w} className="flex gap-2 text-warn">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {w}
                  </li>
                ))}
              </ul>
            )}
            <CompleteExportForm from={p.from} to={p.to} label={label} openCount={open.length} disabled={!finished || user.role !== "admin"} />
          </div>
        </Card>

        <Card className="p-5 text-[14px] text-ink-2">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Info className="size-4" /> So läuft der Export
          </div>
          <ol className="grid list-decimal gap-2 pl-5">
            <li>Am Monatsanfang alle Belege des Vormonats erfassen und Rechnungen festschreiben.</li>
            <li>Paket (ZIP) herunterladen und an eure Steuerberatung schicken oder in DATEV Unternehmen online hochladen.</li>
            <li>„Export abschließen“: Das Paket wird archiviert, die Belege sind danach festgeschrieben.</li>
          </ol>
          <p className="mt-3 text-[13px] text-muted">
            Format: DATEV-Buchungsstapel (EXTF, Version 700, Kategorie 21), Zeichensatz Windows-1252. Kontenzuordnung und Steuerschlüssel sind ein Vorschlag für SKR03 und vor dem
            ersten Import mit eurer Steuerberatung abzustimmen.
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Abgeschlossene Exporte" sub="Archiviert mit Prüfsumme (SHA-256)" />
        {o.exports.length === 0 ? (
          <p className="px-5 pb-5 text-[14px] text-muted">Noch kein Export abgeschlossen.</p>
        ) : (
          <ul className="divide-y divide-line">
            {o.exports.map(({ a, user: who }) => {
              const det = a.detail as { from: string; to: string; label: string; fileId: number; invoices: number; expenses: number };
              return (
                <li key={a.id}>
                  <a href={fileHref(det.fileId, true)} className="flex items-center gap-3 px-5 py-3 text-[14px] hover:bg-sunken/60">
                    <CheckCircle2 className="size-4 text-ok" />
                    <span className="flex-1 font-medium">{det.label}</span>
                    <span className="hidden text-muted sm:inline">
                      {det.invoices} Rechnungen · {det.expenses} Ausgaben
                    </span>
                    <span className="text-right text-[13px] text-muted">
                      {dateTime(a.at)}
                      {who ? ` · ${who}` : ""}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="DATEV-Zuordnung" sub="Vorschlag SKR03. Bitte einmal mit eurer Steuerberatung durchgehen." />
        <div className="p-5">
          <DatevSettingsForm s={o.settings} canEdit={user.role === "admin"} />
        </div>
      </Card>
    </div>
  );
}
