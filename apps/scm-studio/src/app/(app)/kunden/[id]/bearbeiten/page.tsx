import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ClientFields } from "@/components/crm/client-fields";
import { LogoEditor } from "@/components/crm/logo-editor";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { FormActions } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { FormSkeleton, Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteClient, setClientStatus, updateClient } from "@/lib/crm/actions";
import { clientDependencies, getClient } from "@/lib/crm/data";
import { getBranchen } from "@/lib/branchen";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = Number((await params).id);
  const client = Number.isInteger(id) ? await getClient(id).catch(() => null) : null;
  return { title: client ? `${client.name} bearbeiten · Kunden` : "Kunde bearbeiten" };
}

export default function KundeBearbeitenPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="grid max-w-4xl gap-6">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-10 w-2/3 max-w-md" />
          <FormSkeleton fields={10} />
        </div>
      }
    >
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
  const [deps, branchen] = await Promise.all([clientDependencies(id), getBranchen()]);

  return (
    <>
      <PageHeader back={{ href: `/kunden/${id}`, label: client.name }} title="Kundendaten bearbeiten" />
      <div className="grid max-w-4xl gap-6">
        <Card className="p-5 sm:p-7">
          <h2 className="mb-3 text-[15px] font-semibold">Logo</h2>
          <LogoEditor client={{ id: client.id, name: client.name, color: client.color, logoPath: client.logoPath }} size={72} variant="full" />
        </Card>
        <Card className="p-5 sm:p-7">
          <ActionForm action={updateClient.bind(null, id)}>
            <ClientFields client={client} branchen={branchen} />
            <FormActions className="border-t border-hairline pt-5">
              <LinkButton href={`/kunden/${id}`} variant="ghost">
                Abbrechen
              </LinkButton>
              <SubmitButton>Speichern</SubmitButton>
            </FormActions>
          </ActionForm>
        </Card>

        <Card>
          <CardHeader title="Zusammenarbeit beenden oder löschen" />
          <div className="grid gap-4 px-5 pb-5 text-[14px]">
            {client.status !== "beendet" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted">Beendete Kunden verschwinden aus Übersicht und Kontingent. Videos, Rechnungen und Dokumente bleiben erhalten.</p>
                <ActionButton
                  action={setClientStatus.bind(null, id, "beendet")}
                  size="md"
                  className="shrink-0"
                  confirm={{
                    title: `Zusammenarbeit mit ${client.name} beenden?`,
                    message: "Der Kunde verschwindet aus Übersicht und Kontingent. Ihr könnt ihn jederzeit wieder aktivieren.",
                    confirmLabel: "Beenden",
                    tone: "default",
                  }}
                >
                  Zusammenarbeit beenden
                </ActionButton>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted">Die Zusammenarbeit ist beendet.</p>
                <ActionButton action={setClientStatus.bind(null, id, "aktiv")} size="md" className="shrink-0">
                  Wieder aktivieren
                </ActionButton>
              </div>
            )}
            <div className="flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted">
                {deps > 0
                  ? "Löschen geht nicht, weil es schon Videos, Termine, Rechnungen oder Dokumente gibt. Rechnungen müsst ihr 8 Jahre aufbewahren."
                  : "Noch keine Videos, Termine, Rechnungen oder Dokumente. Ihr könnt den Kunden endgültig löschen."}
              </p>
              {deps === 0 && (
                <ActionButton
                  action={deleteClient.bind(null, id)}
                  variant="danger"
                  size="md"
                  className="shrink-0"
                  confirm={{
                    title: `${client.name} löschen?`,
                    message: "Der Kunde wird endgültig gelöscht. Das lässt sich nicht rückgängig machen.",
                    confirmLabel: "Löschen",
                    tone: "danger",
                  }}
                >
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
