import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ScriptGenerator } from "@/components/skripte/script-generator";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { integrations } from "@/lib/env";
import { getAiConfig } from "@/lib/skripte/ai";
import { getScriptOptions } from "@/lib/skripte/data";
import { modelLabel } from "@/lib/skripte/pricing";

export const metadata: Metadata = { title: "Skript schreiben" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function NeuesSkriptPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <Link href="/skripte" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Alle Skripte
      </Link>
      <PageHeader
        scene="Szene 05 · Skripte"
        title="Skript schreiben"
        description="Briefing wählen, Entwurf prüfen, verfeinern und speichern. Ihr habt immer das letzte Wort."
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
  const [{ clients, videos }, cfg] = await Promise.all([getScriptOptions(), getAiConfig()]);
  const video = videos.find((v) => v.id === videoId);
  return (
    <ScriptGenerator
      clients={clients}
      videos={videos}
      initial={{ clientId: video?.clientId ?? clientParam, videoId: video?.id, format: video?.format ?? undefined }}
      live={integrations.openai()}
      modelName={modelLabel(cfg.model)}
    />
  );
}

function GeneratorSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Skeleton className="h-[640px]" />
      <Skeleton className="h-80" />
    </div>
  );
}
