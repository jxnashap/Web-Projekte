import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ExpenseEditor } from "@/components/finanzen/expense-form";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { DetailSkeleton } from "@/components/ui/skeleton";
import { deleteExpense } from "@/lib/finanzen/actions";
import { expenseDocNo } from "@/lib/finanzen/core";
import { getClientOptions, getExpense, getExpenseTitle } from "@/lib/finanzen/data";
import { dateDe, dateTime, eur } from "@/lib/format";
import { fileHref } from "@/lib/storage";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const id = Number((await params).id);
  const supplier = Number.isInteger(id) && id > 0 ? await getExpenseTitle(id).catch(() => null) : null;
  return { title: supplier ? `${supplier} · Ausgaben` : "Ausgaben" };
}

export default function AusgabePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Params }) {
  await connection();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [d, clients] = await Promise.all([getExpense(id), getClientOptions()]);
  if (!d) notFound();
  const { expense: e, file } = d;
  const exported = Boolean(e.exportedAt);

  return (
    <>
      <PageHeader
        scene="Szene 08 · Finanzen"
        back={{ href: `/finanzen/ausgaben?monat=${e.date.slice(0, 7)}`, label: "Ausgaben" }}
        eyebrow={`${expenseDocNo(e.id)} · ${dateDe(e.date)}`}
        title={e.supplier}
        description={`${e.description} · ${eur(e.grossCents)} brutto${exported ? ` · festgeschrieben am ${dateTime(e.exportedAt)}` : ""}`}
      />
      <ExpenseEditor
        exported={exported}
        clients={clients}
        file={
          file
            ? { href: fileHref(file.id), mime: file.mime, name: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)), sha256: file.sha256, late: d.late }
            : null
        }
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
      {!exported && (
        <Card className="mt-6">
          <CardHeader title="Beleg löschen" sub="Falsch erfasst oder doppelt? Die Datei bleibt im Archiv erhalten." />
          <div className="px-5 pb-5 pt-1">
            <ActionButton
              action={deleteExpense.bind(null, e.id)}
              confirm={{ title: `Beleg „${e.supplier}“ löschen?`, message: "Der Beleg verschwindet aus den Ausgaben. Die Datei bleibt im Archiv erhalten.", confirmLabel: "Löschen", tone: "danger" }}
              variant="danger"
              size="md"
            >
              <Trash2 className="size-4" /> Beleg löschen
            </ActionButton>
          </div>
        </Card>
      )}
    </>
  );
}
