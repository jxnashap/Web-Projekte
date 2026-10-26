import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CreativeEngine } from "@/components/skripte/creative-engine";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { integrations } from "@/lib/env";
import { getAiConfig } from "@/lib/skripte/ai";
import { getScriptOptions } from "@/lib/skripte/data";
import { profileFilled } from "@/lib/skripte/engine/profile";
import { CATEGORY_KEYS, type CategoryKey } from "@/lib/skripte/engine/shared";
import { getIdea } from "@/lib/skripte/ideen";
import { modelLabel } from "@/lib/skripte/pricing";

export const metadata: Metadata = { title: "Creative Engine · Ideen & Skripte" };
// Ideen und Skripte brauchen je Aufruf bis zu einer Minute (Server Actions dieser Seite)
export const maxDuration = 180;

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function NeuesSkriptPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <PageHeader
        scene="Szene 05 · Skripte"
        back={{ href: "/skripte", label: "Ideen & Skripte" }}
        title="Creative Engine"
        description="Kunde, Thema und Rahmen rein, fünf grundverschiedene Ideen raus. Aus der besten wird ein drehfertiges Skript mit Kamera, Dialogen und Schnitt."
      />
      <Suspense fallback={<EngineSkeleton />}>
        <Engine searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Engine({ searchParams }: { searchParams: SP }) {
  await connection();
  const raw = await searchParams;
  const videoId = Number(one(raw.video)) || undefined;
  const clientParam = Number(one(raw.kunde)) || undefined;
  const ideaId = Number(one(raw.idee)) || undefined;
  const [{ clients, videos }, cfg, ideaRow] = await Promise.all([getScriptOptions(), getAiConfig(), ideaId ? getIdea(ideaId) : null]);
  const idea = ideaRow?.i;
  // Video: aus der Adresse oder das Video, als das die Idee eingeplant ist
  const video = videos.find((v) => v.id === (videoId ?? idea?.videoId));
  const ideaCats = (idea?.categories ?? []).filter((k): k is CategoryKey => (CATEGORY_KEYS as readonly string[]).includes(k));
  return (
    <CreativeEngine
      clients={clients.map((c) => ({ id: c.id, name: c.name, profile: profileFilled(c.creativeProfile) }))}
      videos={videos.filter((v) => ["idee", "skript", "dreh"].includes(v.status))}
      live={integrations.openai()}
      modelName={modelLabel(cfg.model)}
      initial={{
        clientId: video?.clientId ?? idea?.clientId ?? clientParam,
        videoId: video?.id,
        ideaId: idea?.id,
        topic: idea ? [idea.title, idea.trend && `Trend: ${idea.trend}`].filter(Boolean).join(". ") : undefined,
        categories: ideaCats.length ? ideaCats : undefined,
        goal: idea?.goal ?? undefined,
        concept: idea
          ? {
              title: idea.title,
              categories: ideaCats.length ? ideaCats : ["comedy"],
              hook: idea.hook ?? idea.title,
              concept: idea.description ?? idea.title,
              mechanic: idea.mechanic ?? "",
              production: idea.production ?? undefined,
              scores: idea.scores ?? undefined,
            }
          : undefined,
      }}
    />
  );
}

function EngineSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Skeleton className="h-[720px] rounded-[var(--radius-card)]" />
      <Skeleton className="h-96 rounded-[var(--radius-card)]" />
    </div>
  );
}
