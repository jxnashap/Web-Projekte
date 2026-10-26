import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ClientFields } from "@/components/crm/client-fields";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormActions } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { FormSkeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { createClient } from "@/lib/crm/actions";
import { suggestClientColor } from "@/lib/crm/data";
import { CLIENT_COLORS } from "@/lib/crm/labels";
import { getBranchen } from "@/lib/branchen";

export const metadata: Metadata = { title: "Neuer Kunde · Kunden" };

export default function NeuerKundePage() {
  return (
    <>
      <PageHeader
        back={{ href: "/kunden", label: "Kunden" }}
        title="Neuer Kunde"
        description="Pflicht sind nur Name und Branche. Den Rest ergänzt ihr, sobald ihr ihn wisst."
      />
      <Card className="max-w-4xl p-5 sm:p-7">
        <Suspense fallback={<FormSkeleton fields={8} />}>
          <NewClientForm />
        </Suspense>
      </Card>
    </>
  );
}

async function NewClientForm() {
  await connection();
  const [color, branchen] = await Promise.all([suggestClientColor(CLIENT_COLORS), getBranchen()]);
  return (
    <ActionForm action={createClient}>
      <ClientFields defaultColor={color} branchen={branchen} />
      <FormActions className="border-t border-hairline pt-5">
        <LinkButton href="/kunden" variant="ghost">
          Abbrechen
        </LinkButton>
        <SubmitButton pendingText="Legt an …">Kunde anlegen</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
