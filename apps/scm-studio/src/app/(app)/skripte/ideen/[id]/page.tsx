import { CalendarPlus, Check, ExternalLink, FilePlus2, Pencil, ScrollText, Sparkles, Trash2, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IdeaForm, PlanForm } from "@/components/skripte/idea-form";
import { Badge, Dot } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { DialogButton } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { DetailSkeleton } from "@/components/ui/skeleton";
import { dateDe, monthLabel } from "@/lib/format";
import { BRANCHEN, videoStatus } from "@/lib/labels";
import { getScriptOptions } from "@/lib/skripte/data";
import { getIdea, getIdeaTitle } from "@/lib/skripte/ideen";
import { deleteIdea, planIdea, setIdeaStatus, updateIdea } from "@/lib/skripte/ideen-actions";
import { scriptStatusLabel } from "@/lib/skripte/schema";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const id = Number((await params).id);
  const title = Number.isInteger(id) && id > 0 ? await getIdeaTitle(id) : null;
  return { title: title ? `${title} · Ideen` : "Idee" };
}

export default function IdeaPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <IdeaDetail params={params} />
    </Suspense>
  );
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

async function IdeaDetail({ params }: { params: Params }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [data, { clients }] = await Promise.all([getIdea(id), getScriptOptions()]);
  if (!data) notFound();
  const { i, client, video, author, scripts } = data;
  const fromResearch = i.source === "recherche";

  return (
    <>
      <PageHeader
        scene="Szene 05 · Ideen & Skripte"
        back={{ href: "/skripte", label: "Ideen & Skripte" }}
        eyebrow={fromResearch ? `Vorschlag aus der Recherche vom ${dateDe(i.createdAt)}` : `Idee${author ? ` von ${author}` : ""}`}
        title={i.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {client ? (
              <Link href={`/kunden/${client.id}`} className="hit inline-flex items-center gap-1.5 font-semibold text-ink-2 hover:underline">
                <Dot color={client.color} /> {client.name}
              </Link>
            ) : (
              <span>{i.branche ? `Passt zu: ${BRANCHEN[i.branche] ?? i.branche}` : "Für alle Kunden"}</span>
            )}
            {i.format && <span>· {i.format}</span>}
            {i.status === "vorschlag" && <Badge tone="info">Neu</Badge>}
            {i.status === "verworfen" && <Badge tone="neutral">Verworfen</Badge>}
          </span>
        }
        actions={
          <>
            {i.status === "vorschlag" && (
              <>
                <ActionButton action={setIdeaStatus.bind(null, i.id, "offen")} variant="primary" size="md">
                  <Check className="size-4" aria-hidden /> Übernehmen
                </ActionButton>
                <ActionButton action={setIdeaStatus.bind(null, i.id, "verworfen")} size="md">
                  <X className="size-4" aria-hidden /> Verwerfen
                </ActionButton>
              </>
            )}
            {i.status === "verworfen" && (
              <ActionButton action={setIdeaStatus.bind(null, i.id, "offen")} size="md">
                Zurückholen
              </ActionButton>
            )}
            <DialogButton label="Bearbeiten" title="Idee bearbeiten" variant="secondary" icon={<Pencil className="size-4" />}>
              <IdeaForm action={updateIdea.bind(null, i.id)} clients={clients} idea={i} submitLabel="Speichern" />
            </DialogButton>
            <ActionButton
              action={deleteIdea.bind(null, i.id)}
              variant="ghost"
              size="md"
              confirm={{ title: `„${i.title}“ löschen?`, message: "Skripte zur Idee bleiben erhalten.", confirmLabel: "Löschen", tone: "danger" }}
            >
              <Trash2 className="size-4" aria-hidden /> Löschen
            </ActionButton>
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="grid content-start gap-6 xl:col-span-2">
          <Card>
            <CardHeader title="Die Idee" />
            <div className="grid gap-4 px-5 pb-5">
              {i.hook ? (
                <div className="squircle rounded-[14px] bg-sunken p-4">
                  <div className="text-[13px] font-semibold text-muted">Hook</div>
                  <p className="mt-1 text-[17px] leading-snug text-ink">„{i.hook}“</p>
                </div>
              ) : null}
              {i.description ? (
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{i.description}</p>
              ) : (
                !i.hook && <p className="text-[15px] text-muted">Noch keine Beschreibung. Über „Bearbeiten“ ergänzen.</p>
              )}
            </div>
          </Card>

          {(i.trend || i.sources.length > 0) && (
            <Card>
              <CardHeader title="Trend dahinter" sub="Aus der nächtlichen Recherche, mit den Quellen, auf die sie sich stützt" />
              <div className="grid gap-3 px-5 pb-5">
                {i.trend && <p className="text-[15px] font-semibold text-ink">{i.trend}</p>}
                <ul className="grid gap-1">
                  {i.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noreferrer noopener" className="flex min-h-11 items-center gap-2 rounded-lg px-1 text-[15px] text-accent-ink hover:bg-fill-2">
                        <ExternalLink className="size-4 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{s.title || hostOf(s.url)}</span>
                        <span className="shrink-0 text-[13px] text-muted">{hostOf(s.url)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="text-[13px] text-muted">Vor dem Dreh kurz in der Quelle prüfen, ob der Trend noch läuft und der Sound für Unternehmenskonten freigegeben ist.</p>
              </div>
            </Card>
          )}
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Skript" sub={scripts.length ? `${scripts.length === 1 ? "1 Skript" : `${scripts.length} Skripte`} zu dieser Idee` : "Noch keins"} />
            <div className="grid gap-3 px-5 pb-5">
              {scripts.map((s) => (
                <Link key={s.id} href={`/skripte/${s.id}`} className="squircle flex items-center gap-3 rounded-[14px] bg-sunken p-3 hover:bg-fill-2">
                  <ScrollText className="size-5 shrink-0 text-info" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{s.title}</span>
                    <span className="block text-[13px] text-muted">{scriptStatusLabel(s.status)}</span>
                  </span>
                </Link>
              ))}
              <div className="flex flex-wrap gap-2">
                <LinkButton href={`/skripte/neu?idee=${i.id}`} variant={scripts.length ? "secondary" : "primary"}>
                  <Sparkles className="size-4" /> {scripts.length ? "Noch eins mit KI" : "Mit KI schreiben"}
                </LinkButton>
                <LinkButton href={`/skripte/leer?idee=${i.id}`} variant="secondary">
                  <FilePlus2 className="size-4" /> Selbst schreiben
                </LinkButton>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Einplanen" sub={video ? "Als Video eingeplant" : "Für einen Kunden und Monat, zählt ins Kontingent"} />
            <div className="px-5 pb-5">
              {video ? (
                <Link href={`/produktion/${video.id}`} className="squircle flex items-center gap-3 rounded-[14px] bg-sunken p-3 hover:bg-fill-2">
                  <CalendarPlus className="size-5 shrink-0 text-ok" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{video.title}</span>
                    <span className="block text-[13px] capitalize text-muted">
                      {monthLabel(video.month)} · {videoStatus(video.status).label}
                    </span>
                  </span>
                </Link>
              ) : (
                <PlanForm action={planIdea.bind(null, i.id)} clients={clients} clientId={i.clientId} />
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
