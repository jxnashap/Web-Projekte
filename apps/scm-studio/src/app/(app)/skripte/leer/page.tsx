import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ScriptEditor } from "@/components/skripte/script-editor";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { FormSkeleton } from "@/components/ui/skeleton";
import { createScript } from "@/lib/skripte/actions";
import { getScriptOptions } from "@/lib/skripte/data";
import { scriptFormId } from "@/lib/skripte/schema";

export const metadata: Metadata = { title: "Leeres Skript · Skripte" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// Vorlage nach dem SCM-Bauplan; angelegt wird erst beim Speichern (ein Fehlklick hinterlässt nichts)
const BLANK = [
  { tc: "00:00", label: "Hook", text: "" },
  { tc: "00:02", label: "Wiedererkennen", text: "" },
  { tc: "00:10", label: "Steigerung", text: "" },
  { tc: "00:20", label: "Pointe", text: "" },
  { tc: "00:26", label: "Aufruf", text: "" },
];

export default function LeeresSkriptPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <PageHeader
        scene="Szene 05 · Skripte"
        back={{ href: "/skripte", label: "Skripte" }}
        title="Leeres Skript"
        description="Selbst schreiben nach dem SCM-Bauplan. Angelegt wird es erst, wenn ihr speichert."
      />
      <div className="max-w-4xl">
        <Suspense fallback={<FormSkeleton fields={4} />}>
          <Editor searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Editor({ searchParams }: { searchParams: SP }) {
  await connection();
  const raw = await searchParams;
  const { clients } = await getScriptOptions();
  const clientId = Number(one(raw.kunde)) || null;
  return (
    <Card className="p-5 sm:p-6">
      <ScriptEditor
        action={createScript}
        formId={scriptFormId("neu")}
        isNew
        script={{ title: "Neues Skript", format: null, hook: null, beats: BLANK, caption: null, cta: null, clientId: clients.some((c) => c.id === clientId) ? clientId : null }}
        clients={clients}
      />
    </Card>
  );
}
