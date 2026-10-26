import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ClientFields } from "@/components/crm/client-fields";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { FormActions } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteClient, setClientStatus, updateClient } from "@/lib/crm/actions";
import { clientDependencies, getClient } from "@/lib/crm/data";

export const metadata: Metadata = { title: "Kunde bearbeiten" };

type Props = { params: Promise<{ id: string }> };

export default function KundeBearbeitenPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[900px] max-w-4xl" />}>
      <EditClient params={params} />
    </Suspense>
  );
}

async function EditClient({ params }: Props) {
  await connection();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const client = await getClient(id);
  if (!client) notFound();
  const deps = await clientDependencies(id);

  return (
    <>
      <Link href={`/kunden/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {client.name}
      </Link>
      <PageHeader scene="Szene 03 · Kunden" title="Bearbeiten" description={client.name} />
      <div className="grid max-w-4xl gap-6">
        <Card className="p-5 sm:p-7">
          <ActionForm action={updateClient.bind(null, id)}>
            <ClientFields client={client} />
            <FormActions className="border-t border-line pt-5">
              <LinkButton href={`/kunden/${id}`} variant="ghost">
                Abbrechen
              </LinkButton>
              <SubmitButton>Speichern</SubmitButton>
            </FormActions>
          </ActionForm>
        </Card>

        <Card>
          <CardHeader title="Zusammenarbeit beenden oder löschen" />
          <div className="grid gap-4 p-5 text-[14px]">
            {client.status !== "beendet" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted">Beendete Kunden verschwinden aus Übersicht und Kontingent. Videos, Rechnungen und Dokumente bleiben erhalten.</p>
                <ActionButton action={setClientStatus.bind(null, id, "beendet")} confirm={`Zusammenarbeit mit ${client.name} als beendet markieren?`} size="md">
                  Als beendet markieren
                </ActionButton>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted">Dieser Kunde ist beendet.</p>
                <ActionButton action={setClientStatus.bind(null, id, "aktiv")} size="md">
                  Wieder aktivieren
                </ActionButton>
              </div>
            )}
            <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted">
                {deps > 0
                  ? "Löschen geht nicht, weil es schon Videos, Termine, Rechnungen oder Dokumente gibt. Rechnungen müsst ihr 8 Jahre aufbewahren."
                  : "Noch keine Videos, Termine, Rechnungen oder Dokumente. Ihr könnt den Kunden endgültig löschen."}
              </p>
              {deps === 0 && (
                <ActionButton action={deleteClient.bind(null, id)} variant="danger" size="md" confirm={`${client.name} endgültig löschen?`}>
                  Kunde löschen
                </ActionButton>
              )}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
