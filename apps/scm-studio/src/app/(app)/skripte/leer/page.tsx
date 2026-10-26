import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ScriptEditor } from "@/components/skripte/script-editor";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { FormSkeleton } from "@/components/ui/skeleton";
import { createScript, createScriptForIdea } from "@/lib/skripte/actions";
import { getScriptOptions } from "@/lib/skripte/data";
import { getIdea } from "@/lib/skripte/ideen";
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
        back={{ href: "/skripte", label: "Ideen & Skripte" }}
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
  const ideaId = Number(one(raw.idee)) || null;
  const [{ clients }, ideaRow] = await Promise.all([getScriptOptions(), ideaId ? getIdea(ideaId) : null]);
  const idea = ideaRow?.i ?? null;
  const clientId = Number(one(raw.kunde)) || idea?.clientId || null;
  // Aus einer Idee: Titel, Format und Hook übernehmen
  const beats = idea?.hook ? BLANK.map((b) => (b.label === "Hook" ? { ...b, text: idea.hook! } : b)) : BLANK;
  return (
    <Card className="p-5 sm:p-6">
      {idea && <p className="mb-4 text-[15px] text-muted">Gehört zur Idee „{idea.title}“.</p>}
      <ScriptEditor
        action={idea ? createScriptForIdea.bind(null, idea.id) : createScript}
        formId={scriptFormId("neu")}
        isNew
        script={{
          title: idea?.title ?? "Neues Skript",
          format: idea?.format ?? null,
          hook: null,
          beats,
          caption: null,
          cta: null,
          clientId: clients.some((c) => c.id === clientId) ? clientId : null,
        }}
        clients={clients}
      />
    </Card>
  );
}
