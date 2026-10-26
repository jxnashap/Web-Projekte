// Export für die Steuerberatung: DATEV-Buchungsstapel (EXTF, Windows-1252), Journal (CSV) und ZIP mit
// Rechnungs-PDFs und Belegen (Dateiname = Belegfeld 1).
import "server-only";
import { zipSync } from "fflate";
import { readFile } from "@/lib/storage";
import { buildExtf, buildJournalCsv, expenseDocNo, extfRows, extFor, toCp1252 } from "./core";
import { getDatevSettings, getJournal } from "./data";

export async function buildExtfFile(from: string, to: string, label: string, user: string) {
  const [journal, settings] = await Promise.all([getJournal(from, to), getDatevSettings()]);
  const rows = extfRows(journal.invoices, journal.expenses, settings, journal.smallBusiness);
  const text = buildExtf({ rows, settings, from, to, label, createdAt: new Date(), user });
  return { data: toCp1252(text), journal, rows: rows.length };
}

export async function buildJournalFile(from: string, to: string) {
  const journal = await getJournal(from, to);
  return new TextEncoder().encode(buildJournalCsv(journal.invoices, journal.expenses));
}

export async function buildExportZip(from: string, to: string, label: string, user: string) {
  const extf = await buildExtfFile(from, to, label, user);
  const { journal } = extf;
  const files: Record<string, Uint8Array> = {
    [`EXTF_Buchungsstapel_${from}_${to}.csv`]: extf.data,
    [`Journal_${from}_${to}.csv`]: new TextEncoder().encode(buildJournalCsv(journal.invoices, journal.expenses)),
  };
  for (const inv of journal.invoices) {
    if (!inv.fileId) continue;
    const f = await readFile(inv.fileId).catch(() => null);
    if (f) files[`Rechnungen/${inv.number}.pdf`] = f.data;
  }
  for (const e of journal.expenses) {
    if (!e.fileId) continue;
    const f = await readFile(e.fileId).catch(() => null);
    if (f) files[`Belege/${expenseDocNo(e.id)}.${extFor(f.meta.mime, f.meta.name)}`] = f.data;
  }
  files["LIESMICH.txt"] = new TextEncoder().encode(
    [
      `Export aus SCM Studio für ${label} (${from} bis ${to}).`,
      "",
      "EXTF_Buchungsstapel: DATEV-Format Buchungsstapel (Version 700, Kategorie 21), Zeichensatz Windows-1252.",
      "Journal: alle Rechnungen, Stornos und Ausgaben als Tabelle (UTF-8).",
      "Rechnungen/: festgeschriebene Rechnungen als ZUGFeRD-PDF (E-Rechnung EN 16931), byte-genau wie versendet.",
      "Belege/: Eingangsbelege, Dateiname entspricht Belegfeld 1 im Buchungsstapel.",
      "",
      "Kontenzuordnung und Steuerschlüssel sind ein Vorschlag (SKR03) und vor dem ersten Import mit der Steuerberatung abzustimmen.",
    ].join("\r\n"),
  );
  return { data: zipSync(files, { level: 6 }), invoiceCount: journal.invoices.length, expenseCount: journal.expenses.length };
}
