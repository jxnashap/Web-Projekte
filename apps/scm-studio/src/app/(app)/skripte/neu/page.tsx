import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ScriptGenerator } from "@/components/skripte/script-generator";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { integrations } from "@/lib/env";
import { getAiConfig } from "@/lib/skripte/ai";
import { getScriptOptions } from "@/lib/skripte/data";
import { getIdea } from "@/lib/skripte/ideen";
import { modelLabel } from "@/lib/skripte/pricing";

export const metadata: Metadata = { title: "Skript schreiben · Skripte" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function NeuesSkriptPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <PageHeader
        scene="Szene 05 · Skripte"
        back={{ href: "/skripte", label: "Ideen & Skripte" }}
        title="Skript schreiben"
        description="Briefing ausfüllen, Entwurf prüfen, verfeinern und speichern. Ihr habt immer das letzte Wort."
      />
      <Suspense fallback={<GeneratorSkeleton />}>
        <Generator searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Generator({ searchParams }: { searchParams: SP }) {
  await connection();
  const raw = await searchParams;
  const videoId = Number(one(raw.video)) || undefined;
  const clientParam = Number(one(raw.kunde)) || undefined;
  const ideaId = Number(one(raw.idee)) || undefined;
  const [{ clients, videos }, cfg, ideaRow] = await Promise.all([getScriptOptions(), getAiConfig(), ideaId ? getIdea(ideaId) : null]);
  const idea = ideaRow?.i;
  // Video: aus der Adresse oder das Video, als das die Idee eingeplant ist
  const video = videos.find((v) => v.id === (videoId ?? idea?.videoId));
  // Briefing aus der Idee (ohne Quellen-Links, die bringen der KI nichts)
  const briefing = idea ? [idea.title, idea.hook && `Hook-Idee: ${idea.hook}`, idea.description, idea.trend && `Trend: ${idea.trend}`].filter(Boolean).join("\n").slice(0, 1500) : undefined;
  return (
    <ScriptGenerator
      clients={clients}
      videos={videos}
      initial={{
        clientId: video?.clientId ?? idea?.clientId ?? clientParam,
        videoId: video?.id,
        format: video?.format ?? idea?.format ?? undefined,
        briefing,
        idea: idea ? { id: idea.id, title: idea.title } : undefined,
      }}
      live={integrations.openai()}
      modelName={modelLabel(cfg.model)}
    />
  );
}

function GeneratorSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Skeleton className="h-[640px] rounded-[var(--radius-card)]" />
      <Skeleton className="h-96 rounded-[var(--radius-card)]" />
    </div>
  );
}
