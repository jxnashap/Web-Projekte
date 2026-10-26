import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DrehModus } from "@/components/skripte/dreh-modus";
import { DrehbuchView } from "@/components/skripte/drehbuch-view";
import { ScriptEditor } from "@/components/skripte/script-editor";
import { ScriptHeaderActions } from "@/components/skripte/script-header-actions";
import { SourceBadge } from "@/components/skripte/source-badge";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Dot } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { DetailSkeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { LinkTabs } from "@/components/ui/tabs";
import { dateTime, monthLabel } from "@/lib/format";
import { videoStatus } from "@/lib/labels";
import { deleteScript, duplicateScript, linkToVideo, saveScript, setScriptStatus } from "@/lib/skripte/actions";
import { getScript, getScriptOptions, getScriptTitle } from "@/lib/skripte/data";
import { modelLabel } from "@/lib/skripte/pricing";
import type { Script } from "@/db/schema";
import { categoryLabel } from "@/lib/skripte/engine/shared";
import { mergeHookAndCta, scriptFormId, scriptStatusLabel } from "@/lib/skripte/schema";

type Params = Promise<{ id: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const id = Number((await params).id);
  const title = Number.isInteger(id) && id > 0 ? await getScriptTitle(id) : null;
  return { title: title ? `${title} · Skripte` : "Skript" };
}

export default function SkriptPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <SkriptDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function SkriptDetail({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const sp = await searchParams;
  const view = sp.ansicht === "drehbuch" ? "drehbuch" : sp.ansicht === "dreh" ? "dreh" : "bearbeiten";
  const [row, opts] = await Promise.all([getScript(id), getScriptOptions()]);
  if (!row) notFound();
  const { s, client, video, author, ideaTitle } = row;
  const videoChoices = opts.videos.filter((v) => !s.clientId || v.clientId === s.clientId);
  if (video && !videoChoices.some((v) => v.id === video.id)) videoChoices.unshift({ ...video, scriptId: video.scriptId });

  return (
    <>
      <PageHeader
        scene="Szene 05 · Skripte"
        back={s.ideaId ? { href: `/skripte/ideen/${s.ideaId}`, label: "Idee" } : { href: "/skripte?ansicht=skripte", label: "Skripte" }}
        eyebrow={s.ideaId && ideaTitle ? `Zur Idee „${ideaTitle}“` : undefined}
        title={s.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {client ? (
              <Link href={`/kunden/${client.id}`} className="hit inline-flex items-center gap-1.5 font-semibold text-ink-2 hover:underline">
                <Dot color={client.color} /> {client.name}
              </Link>
            ) : (
              <span>Ohne Kunde</span>
            )}
            {s.format && <span>· {s.format}</span>}
            <SourceBadge source={s.source} />
            <Badge tone={s.status === "final" ? "ok" : "neutral"}>{scriptStatusLabel(s.status)}</Badge>
          </span>
        }
        actions={
          <ScriptHeaderActions
            title={s.title}
            status={s.status}
            editing={view === "bearbeiten"}
            pdfHref={`/api/skripte/${s.id}/pdf`}
            setFinal={setScriptStatus.bind(null, s.id, "final")}
            setDraft={setScriptStatus.bind(null, s.id, "entwurf")}
            duplicate={duplicateScript.bind(null, s.id)}
            remove={deleteScript.bind(null, s.id)}
            formId={scriptFormId(s.id)}
          />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 content-start gap-5">
          <LinkTabs
            items={[
              { href: `/skripte/${s.id}`, label: "Bearbeiten", active: view === "bearbeiten" },
              { href: `/skripte/${s.id}?ansicht=drehbuch`, label: "Drehbuch", active: view === "drehbuch" },
              { href: `/skripte/${s.id}?ansicht=dreh`, label: "Drehmodus", active: view === "dreh" },
            ]}
          />
          {view === "drehbuch" ? (
            <DrehbuchView script={s} clientName={client?.name ?? null} />
          ) : view === "dreh" ? (
            <DrehModus
              scriptId={s.id}
              version={String(new Date(s.updatedAt).getTime())}
              title={s.title}
              beats={mergeHookAndCta(s.beats, s.hook, s.cta)}
              production={s.production}
            />
          ) : (
            <Card className="p-5 sm:p-6">
              <ScriptEditor
                key={s.id}
                formId={scriptFormId(s.id)}
                action={saveScript.bind(null, s.id)}
                script={{ title: s.title, format: s.format, hook: s.hook, beats: s.beats, caption: s.caption, cta: s.cta, clientId: s.clientId }}
                clients={opts.clients}
              />
            </Card>
          )}
        </div>

        <aside className="grid content-start gap-6">
          {(s.concept || s.categories.length > 0 || s.production || s.alternatives) && <ConceptCard s={s} />}
          <Card>
            <CardHeader title="Video" sub={video ? "Verknüpft" : "Noch nicht verknüpft"} />
            <div className="grid gap-4 px-5 pb-5">
              {video && (
                <Link
                  href={`/produktion/${video.id}`}
                  className="squircle flex items-center gap-3 rounded-[14px] bg-sunken p-3 transition-colors hover:bg-fill"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{video.title}</div>
                    <div className="mt-0.5 text-[13px] text-muted">
                      {videoStatus(video.status).label} · {monthLabel(video.month)}
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                </Link>
              )}
              <ActionForm action={linkToVideo.bind(null, s.id)} className="grid gap-2">
                <Field label={video ? "Anderes Video" : "Mit Video verknüpfen"} name="videoId">
                  <Select name="videoId" defaultValue={String(video?.id ?? "")}>
                    <option value="">Kein Video</option>
                    {videoChoices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="flex justify-end">
                  <SubmitButton variant="secondary" size="sm">
                    Verknüpfen
                  </SubmitButton>
                </div>
              </ActionForm>
            </div>
          </Card>

          <Card>
            <CardHeader title="Infos" />
            <dl className="grid gap-3 px-5 pb-5 text-[14px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Entstanden</dt>
                <dd className="text-right">{s.source === "ki" ? `KI (${modelLabel(s.model ?? "")})` : s.source === "demo" ? "Demo-Generator" : "Von Hand"}</dd>
              </div>
              {author && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Von</dt>
                  <dd className="text-right">{author}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Zuletzt geändert</dt>
                <dd className="text-right">{dateTime(s.updatedAt)}</dd>
              </div>
              {s.briefing && (
                <div className="border-t border-hairline pt-3">
                  <dt className="text-muted">Briefing</dt>
                  <dd className="mt-1 whitespace-pre-line text-ink-2">{s.briefing}</dd>
                </div>
              )}
            </dl>
          </Card>
        </aside>
      </div>
    </>
  );
}

/** Was die Creative Engine zum Skript mitgibt: Kategorien, Ziel, Handlung, Drehaufwand, Alternativen. */
function ConceptCard({ s }: { s: Script }) {
  const p = s.production;
  return (
    <Card>
      <CardHeader
        title="Konzept"
        sub={[s.categories.map(categoryLabel).join(" + "), s.goal, s.durationSeconds ? `${s.durationSeconds} Sekunden` : null].filter(Boolean).join(" · ") || undefined}
      />
      <div className="grid gap-3 px-5 pb-5 text-[14px]">
        {s.concept && <p className="leading-relaxed text-ink-2">{s.concept}</p>}
        {p && (
          <dl className="grid gap-1 border-t border-hairline pt-3">
            <div>
              <dt className="inline text-muted">Personen: </dt>
              <dd className="inline">
                {p.actors}
                {p.roles.length ? ` (${p.roles.join(", ")})` : ""}
              </dd>
            </div>
            {p.location && (
              <div>
                <dt className="inline text-muted">Drehort: </dt>
                <dd className="inline">{p.location}</dd>
              </div>
            )}
            {p.props.length > 0 && (
              <div>
                <dt className="inline text-muted">Requisiten: </dt>
                <dd className="inline">{p.props.join(", ")}</dd>
              </div>
            )}
            <div>
              <dt className="inline text-muted">Drehzeit: </dt>
              <dd className="inline">ca. {p.minutes} Minuten</dd>
            </div>
          </dl>
        )}
        {s.alternatives && (s.alternatives.hooks.length > 0 || s.alternatives.punchlines.length > 0) && (
          <div className="grid gap-2 border-t border-hairline pt-3">
            {s.alternatives.hooks.length > 0 && (
              <div>
                <div className="text-[13px] font-semibold text-muted">Alternative Hooks</div>
                <ul className="mt-1 grid gap-1 text-ink-2">
                  {s.alternatives.hooks.map((h) => (
                    <li key={h}>„{h}“</li>
                  ))}
                </ul>
              </div>
            )}
            {s.alternatives.punchlines.length > 0 && (
              <div>
                <div className="text-[13px] font-semibold text-muted">Alternative Pointen</div>
                <ul className="mt-1 grid gap-1 text-ink-2">
                  {s.alternatives.punchlines.map((h) => (
                    <li key={h}>„{h}“</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
