import { AlertTriangle, CheckCircle2, Download, FileArchive, FileSpreadsheet, Settings2 } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CompleteExportForm, DatevSettingsForm } from "@/components/finanzen/export-forms";
import { AmountRow } from "@/components/finanzen/figure";
import { FinanzenNav } from "@/components/finanzen/finanzen-nav";
import { parsePeriod, PeriodNav } from "@/components/finanzen/period-nav";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ParamDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { FormSkeleton, Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { periodRange, plural } from "@/lib/finanzen/core";
import { defaultExportMonth, getDatevSettings, getExportOverview } from "@/lib/finanzen/data";
import { dateShort, dateTime, eur, monthLabel } from "@/lib/format";
import { fileHref } from "@/lib/storage";
import { todayIso } from "@/lib/time";

export const metadata = { title: "Export · Finanzen" };

export default function ExportPage({ searchParams }: PageProps<"/finanzen/export">) {
  return (
    <>
      <PageHeader
        scene="Szene 08 · Finanzen"
        title="Export für die Steuerberatung"
        description="Einmal im Monat: Buchungsstapel im DATEV-Format, Journal und alle Belege als ZIP. Danach sind die Belege festgeschrieben."
      />
      <FinanzenNav active="export" />
      <Suspense
        fallback={
          <div className="grid gap-6">
            <Skeleton className="h-9 w-full max-w-md" />
            <Skeleton className="h-72 rounded-[var(--radius-card)]" />
          </div>
        }
      >
        <Export searchParams={searchParams} />
      </Suspense>
      <ParamDialog param="datev" title="DATEV-Zuordnung" description="Vorschlag für SKR03. Bitte einmal mit eurer Steuerberatung durchgehen." size="xl">
        <Suspense fallback={<FormSkeleton fields={8} />}>
          <DatevDialog />
        </Suspense>
      </ParamDialog>
    </>
  );
}

async function DatevDialog() {
  await connection();
  const [user, settings] = await Promise.all([requireUser(), getDatevSettings()]);
  return <DatevSettingsForm s={settings} canEdit={user.role === "admin"} />;
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
  const datevHref = `/finanzen/export?zeitraum=${kind}&bezug=${ym}&datev=1`;
  const open = o.expenses.filter((e) => !e.exportedAt);
  const missing = o.expenses.filter((e) => !e.fileId);
  const missingOpen = open.filter((e) => !e.fileId);
  const sumInv = o.invoices.reduce((s, i) => s + i.grossCents, 0);
  const sumExp = o.expenses.reduce((s, e) => s + e.grossCents, 0);
  const finished = p.to < todayIso();
  const numbersMissing = !o.settings.beraterNr || !o.settings.mandantNr;

  const warnings: React.ReactNode[] = [];
  if (numbersMissing)
    warnings.push(
      <>
        Berater- und Mandantennummer fehlen. Ohne sie kann eure Steuerberatung den Buchungsstapel nicht importieren.{" "}
        <Link href={datevHref} scroll={false} className="font-semibold underline underline-offset-2">
          Jetzt eintragen
        </Link>
      </>,
    );
  if (missing.length)
    warnings.push(
      <>
        {plural(missing.length, "Ausgabe", "Ausgaben")} ohne Belegdatei:{" "}
        {missing.slice(0, 5).map((e, i) => (
          <span key={e.id}>
            {i > 0 ? ", " : ""}
            <Link href={`/finanzen/ausgaben/${e.id}`} className="font-semibold underline underline-offset-2">
              {e.supplier} ({dateShort(e.date)})
            </Link>
          </span>
        ))}
        {missing.length > 5 ? ` und ${missing.length - 5} weitere` : ""}.
      </>,
    );
  if (o.draftInvoices)
    warnings.push(
      <>
        {plural(o.draftInvoices, "Rechnungsentwurf ist", "Rechnungsentwürfe sind")} noch nicht festgeschrieben und fehlen im Export.{" "}
        <Link href="/finanzen/rechnungen?status=entwurf" className="font-semibold underline underline-offset-2">
          Entwürfe ansehen
        </Link>
      </>,
    );
  if (!finished) warnings.push(<>Der Zeitraum läuft noch. Abschließen geht erst, wenn er vorbei ist.</>);

  return (
    <div className="grid gap-6">
      <PeriodNav base="/finanzen/export" kind={kind} ym={ym} label={label} homeYm={defaultExportMonth()} homeLabel="Vormonat" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title={`Inhalt ${label}`} sub="Festgeschriebene Rechnungen und Stornos nach Rechnungsdatum, Ausgaben nach Belegdatum" />
          <div className="divide-y divide-line px-5 pb-3">
            <AmountRow label={plural(o.invoices.length, "Rechnung oder Storno", "Rechnungen und Stornos")} value={eur(sumInv)} hint="brutto" />
            <AmountRow
              label={plural(o.expenses.length, "Ausgabe", "Ausgaben")}
              value={eur(sumExp)}
              hint={`brutto, davon ${o.expenses.length - open.length} bereits exportiert`}
            />
          </div>
          <div className="grid gap-2 border-t border-line p-5 sm:grid-cols-3">
            <a className={buttonClass("secondary")} href={`/api/finanzen/export?${qs}&format=extf`} download>
              <FileSpreadsheet className="size-4" /> DATEV-Datei laden
            </a>
            <a className={buttonClass("secondary")} href={`/api/finanzen/export?${qs}&format=journal`} download>
              <Download className="size-4" /> Journal laden
            </a>
            <a className={buttonClass("secondary")} href={`/api/finanzen/export?${qs}&format=zip`} download>
              <FileArchive className="size-4" /> Paket laden (ZIP)
            </a>
          </div>
          <div className="border-t border-line p-5">
            {warnings.length > 0 && (
              <ul className="mb-4 grid gap-2 text-[14px]">
                {warnings.map((w, i) => (
                  <li key={i} className="flex gap-2 text-warn">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            )}
            <CompleteExportForm
              from={p.from}
              to={p.to}
              label={label}
              openCount={open.length}
              missingCount={missingOpen.length}
              disabled={!finished || user.role !== "admin" || open.length === 0}
            />
            {user.role !== "admin" && <p className="mt-2 text-[13px] text-muted">Abschließen dürfen nur Inhaber.</p>}
            {finished && open.length === 0 && o.expenses.length > 0 && <p className="mt-2 text-[13px] text-muted">Alle Belege dieses Zeitraums sind schon festgeschrieben.</p>}
          </div>
        </Card>

        <Card className="text-[14px] text-ink-2">
          <CardHeader title="So läuft der Export" />
          <div className="px-5 pb-5">
            <ol className="grid list-decimal gap-2 pl-5">
              <li>Am Monatsanfang alle Belege des Vormonats erfassen und Rechnungen festschreiben.</li>
              <li>Paket (ZIP) laden und an eure Steuerberatung schicken oder in DATEV Unternehmen online hochladen.</li>
              <li>„Export abschließen“: Das Paket wird archiviert, die Belege sind danach festgeschrieben.</li>
            </ol>
            <p className="mt-3 text-[13px] text-muted">
              Format: DATEV-Buchungsstapel (EXTF, Version 700, Kategorie 21), Zeichensatz Windows-1252. Kontenzuordnung und Steuerschlüssel sind ein Vorschlag für SKR03 und vor
              dem ersten Import mit eurer Steuerberatung abzustimmen.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader title="Abgeschlossene Exporte" sub="Archiviert mit Prüfsumme (SHA-256)" />
          {o.exports.length === 0 ? (
            <EmptyState variant="inline" title="Noch kein Export abgeschlossen">
              Nach dem ersten Abschluss liegt das Paket hier zum erneuten Laden.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {o.exports.map(({ a, user: who }) => {
                const det = a.detail as { from: string; to: string; label: string; fileId: number; invoices: number; expenses: number };
                return (
                  <li key={a.id}>
                    <a href={fileHref(det.fileId, true)} className="flex min-h-12 items-center gap-3 px-5 py-3 text-[14px] hover:bg-fill-2">
                      <CheckCircle2 className="size-4 shrink-0 text-ok" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{det.label}</span>
                        <span className="block text-[13px] text-muted">
                          {plural(det.invoices, "Rechnung", "Rechnungen")} · {plural(det.expenses, "Ausgabe", "Ausgaben")}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-[13px] text-muted">
                        {dateTime(a.at)}
                        {who ? <span className="block">{who}</span> : null}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="DATEV-Zuordnung" sub="Konten und Steuerschlüssel für den Buchungsstapel" />
          <dl className="grid gap-1.5 px-5 text-[14px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Kontenrahmen</dt>
              <dd className="font-medium">SKR{o.settings.kontenrahmen}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Beraternummer</dt>
              <dd className={o.settings.beraterNr ? "font-medium tabular-nums" : "font-medium text-warn"}>{o.settings.beraterNr || "fehlt"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Mandantennummer</dt>
              <dd className={o.settings.mandantNr ? "font-medium tabular-nums" : "font-medium text-warn"}>{o.settings.mandantNr || "fehlt"}</dd>
            </div>
          </dl>
          <div className="p-5">
            <LinkButton href={datevHref} scroll={false} variant="secondary" className="w-full sm:w-auto">
              <Settings2 className="size-4" /> {user.role === "admin" ? "Zuordnung bearbeiten" : "Zuordnung ansehen"}
            </LinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}
