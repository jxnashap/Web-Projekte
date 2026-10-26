import { connection } from "next/server";
import { Suspense } from "react";
import { FinanzenNav } from "@/components/finanzen/finanzen-nav";
import { NewDraftForm } from "@/components/finanzen/new-draft-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getClientOptions } from "@/lib/finanzen/data";
import { monthIso } from "@/lib/time";

export const metadata = { title: "Neuer Beleg" };

export default function NeuPage({ searchParams }: PageProps<"/finanzen/rechnungen/neu">) {
  return (
    <>
      <PageHeader scene="Szene 08 · Finanzen" title="Neuer Entwurf" description="Erst Entwurf, dann Vorschau, dann festschreiben. Die Nummer wird erst beim Festschreiben vergeben." />
      <FinanzenNav active="rechnungen" />
      <Card className="max-w-xl p-5 sm:p-6">
        <Suspense fallback={<Skeleton className="h-72" />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/finanzen/rechnungen/neu">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const clients = await getClientOptions();
  const kind = sp.art === "angebot" ? "angebot" : "rechnung";
  const clientId = Number(sp.kunde) || undefined;
  return <NewDraftForm clients={clients} kind={kind} clientId={clients.some((c) => c.id === clientId) ? clientId : undefined} month={monthIso()} />;
}
