import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ClientFields } from "@/components/crm/client-fields";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormActions } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { createClient } from "@/lib/crm/actions";
import { suggestClientColor } from "@/lib/crm/data";
import { CLIENT_COLORS } from "@/lib/crm/labels";

export const metadata: Metadata = { title: "Neuer Kunde" };

export default function NeuerKundePage() {
  return (
    <>
      <Link href="/kunden" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Alle Kunden
      </Link>
      <PageHeader scene="Szene 03 · Kunden" title="Neuer Kunde" description="Pflicht ist nur der Name. Den Rest ergänzt ihr, sobald ihr ihn wisst." />
      <Card className="max-w-4xl p-5 sm:p-7">
        <Suspense fallback={<Skeleton className="h-[900px]" />}>
          <NewClientForm />
        </Suspense>
      </Card>
    </>
  );
}

async function NewClientForm() {
  await connection();
  const color = await suggestClientColor(CLIENT_COLORS);
  return (
        <ActionForm action={createClient}>
          <ClientFields defaultColor={color} />
          <FormActions className="border-t border-line pt-5">
            <LinkButton href="/kunden" variant="ghost">
              Abbrechen
            </LinkButton>
            <SubmitButton pendingText="Legt an …">Kunde anlegen</SubmitButton>
          </FormActions>
        </ActionForm>
  );
}
