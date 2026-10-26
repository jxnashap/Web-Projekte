"use client";
// Person einladen. Mit Supabase erscheint danach der Zugangslink zum Weitergeben (kein Mailversand nötig).
import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormActions, FormGrid, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";
import { AccessLinkShare } from "./access-link";

export function TeamInviteCard({ supabase, action }: { supabase: boolean; action: (prev: ActionState, fd: FormData) => Promise<ActionState> }) {
  const [name, setName] = useState("");
  const [shared, setShared] = useState<{ link: string; name: string } | null>(null);
  return (
    <Card>
      <CardHeader title="Person einladen" sub={supabase ? "Danach bekommt ihr einen Zugangslink, den ihr der Person schickt." : undefined} />
      <ActionForm
        action={action}
        resetOnSuccess
        onSuccess={(s) => {
          if (s.link) setShared({ link: s.link, name: name.trim() });
          setName("");
        }}
        className="grid gap-4 px-5 pb-5 pt-1"
      >
        <FormGrid>
          <Field label="Name" name="name">
            <Input name="name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="E-Mail" name="email">
            <Input name="email" type="email" autoComplete="off" />
          </Field>
          <Field label="Rolle" name="role" hint="Inhaber dürfen Einstellungen, Festschreiben und Export">
            <Select name="role" defaultValue="team">
              <option value="team">Team</option>
              <option value="admin">Inhaber</option>
            </Select>
          </Field>
        </FormGrid>
        <FormActions className="mt-0">
          <SubmitButton>{supabase ? "Einladen und Link erzeugen" : "Person anlegen"}</SubmitButton>
        </FormActions>
      </ActionForm>
      <Dialog open={Boolean(shared)} onClose={() => setShared(null)} title="Zugangslink" description={shared ? `Für ${shared.name}` : undefined}>
        {shared && <AccessLinkShare link={shared.link} name={shared.name} />}
      </Dialog>
    </Card>
  );
}
