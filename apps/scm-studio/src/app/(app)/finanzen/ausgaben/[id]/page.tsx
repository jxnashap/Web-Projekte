import { ArrowLeft, ExternalLink, Lock, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExpenseForm } from "@/components/finanzen/expense-form";
import { FinanzenNav } from "@/components/finanzen/finanzen-nav";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteExpense } from "@/lib/finanzen/actions";
import { expenseDocNo } from "@/lib/finanzen/core";
import { getClientOptions, getExpense } from "@/lib/finanzen/data";
import { dateTime, eur } from "@/lib/format";
import { fileHref } from "@/lib/storage";

export const metadata = { title: "Beleg" };

export default function AusgabePage({ params }: PageProps<"/finanzen/ausgaben/[id]">) {
  return (
    <>
      <Link href="/finanzen/ausgaben" className="mb-3 inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Ausgaben
      </Link>
      <Suspense fallback={<Skeleton className="h-[60vh]" />}>
        <Detail params={params} />
      </Suspense>
    </>
  );
}

async function Detail({ params }: { params: PageProps<"/finanzen/ausgaben/[id]">["params"] }) {
  const { id } = await params;
  const d = await getExpense(Number(id));
  if (!d) notFound();
  const { expense: e, file } = d;
  const clients = await getClientOptions();
  const exported = Boolean(e.exportedAt);
  const isImage = file?.mime.startsWith("image/");
  const isPdf = file?.mime === "application/pdf";

  return (
    <>
      <PageHeader
        scene="Szene 08 · Finanzen"
        title={e.supplier}
        description={`${expenseDocNo(e.id)} · ${e.description} · ${eur(e.grossCents)} brutto`}
        actions={
          !exported ? (
            <ActionButton action={deleteExpense.bind(null, e.id)} confirm="Diesen Beleg löschen? Die Datei bleibt im Archiv erhalten." variant="danger" size="md">
              <Trash2 className="size-4" /> Löschen
            </ActionButton>
          ) : undefined
        }
      />
      <FinanzenNav active="ausgaben" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="p-5 sm:p-6">
          {exported && (
            <div className="mb-5 flex items-start gap-3 rounded-xl bg-sunken p-4 text-[14px]">
              <Lock className="mt-0.5 size-4 shrink-0" />
              <div>
                <div className="font-semibold">Festgeschrieben</div>
                <div className="text-muted">Am {dateTime(e.exportedAt)} an die Buchhaltung exportiert. Korrekturen bitte mit eurer Steuerberatung abstimmen.</div>
              </div>
            </div>
          )}
          <ExpenseForm
            exported={exported}
            clients={clients}
            defaults={{
              id: e.id,
              date: e.date,
              supplier: e.supplier,
              description: e.description,
              category: e.category,
              grossCents: e.grossCents,
              netCents: e.netCents,
              taxRate: e.taxRate,
              reverseCharge: e.reverseCharge,
              paymentMethod: e.paymentMethod,
              paidOn: e.paidOn,
              supplierInvoiceNo: e.supplierInvoiceNo,
              clientId: e.clientId,
              notes: e.notes,
              receiptName: e.receiptName,
            }}
          />
        </Card>
        <Card className="overflow-hidden lg:sticky lg:top-24 lg:self-start">
          <CardHeader
            title="Belegdatei"
            sub={file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : undefined}
            action={
              file ? (
                <LinkButton href={fileHref(file.id)} target="_blank" variant="ghost" size="sm" prefetch={false}>
                  Öffnen <ExternalLink className="size-4" />
                </LinkButton>
              ) : undefined
            }
          />
          {!file ? (
            <div className="p-5">
              <EmptyState title="Noch keine Datei">Ladet links ein Foto oder PDF hoch. Ohne Beleg erkennt das Finanzamt die Vorsteuer nicht an.</EmptyState>
            </div>
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileHref(file.id)} alt={`Beleg ${e.supplier}`} className="max-h-[70vh] w-full bg-sunken object-contain" />
          ) : isPdf ? (
            <iframe src={fileHref(file.id)} title={`Beleg ${e.supplier}`} className="h-[70vh] w-full bg-sunken" />
          ) : (
            <p className="p-5 text-[14px] text-muted">Vorschau für diesen Dateityp nicht möglich. Über „Öffnen“ herunterladen.</p>
          )}
          {file && <p className="break-all border-t border-line px-5 py-3 font-mono text-[11px] text-muted">SHA-256 {file.sha256}</p>}
        </Card>
      </div>
    </>
  );
}
