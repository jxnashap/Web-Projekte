import { connection } from "next/server";
import { Suspense } from "react";
import { NewDraftForm } from "@/components/finanzen/new-draft-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { FormSkeleton } from "@/components/ui/skeleton";
import { getClientOptions, getLeadOptions } from "@/lib/finanzen/data";
import { monthIso } from "@/lib/time";

export const metadata = { title: "Neuer Entwurf · Rechnungen" };

export default function NeuPage({ searchParams }: PageProps<"/finanzen/rechnungen/neu">) {
  return (
    <>
      <PageHeader
        scene="Szene 08 · Finanzen"
        back={{ href: "/finanzen/rechnungen", label: "Rechnungen" }}
        title="Neuer Entwurf"
        description="Erst Entwurf, dann Vorschau, dann festschreiben. Die Nummer wird erst beim Festschreiben vergeben."
      />
      <Suspense fallback={<FormSkeleton fields={3} />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/finanzen/rechnungen/neu">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const [clients, leads] = await Promise.all([getClientOptions(), getLeadOptions()]);
  const kind = sp.art === "angebot" ? "angebot" : "rechnung";
  const clientId = Number(sp.kunde) || undefined;
  const leadId = Number(sp.anfrage) || undefined;
  const recipient =
    clientId && clients.some((c) => c.id === clientId)
      ? `kunde:${clientId}`
      : leadId && leads.some((l) => l.id === leadId)
        ? `anfrage:${leadId}`
        : undefined;
  return (
    <Card className="max-w-xl p-5 sm:p-6">
      <NewDraftForm clients={clients} leads={leads} kind={leadId && recipient ? "angebot" : kind} recipient={recipient} month={monthIso()} />
    </Card>
  );
}
