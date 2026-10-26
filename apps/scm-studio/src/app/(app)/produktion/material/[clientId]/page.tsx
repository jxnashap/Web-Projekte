import { ChevronRight, ExternalLink, File, FileArchive, FileAudio, FileImage, FileText, FileType, FileVideo, Folder, FolderOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { MaterialUpload } from "@/components/produktion/material-upload";
import { DeleteFolderButton, DeleteMaterialButton, MaterialUrlForm, ZipButton } from "@/components/produktion/material-tools";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { Material } from "@/db/schema";
import { dateShort } from "@/lib/format";
import { getMaterial, materialLinks, PREVIEW_TYPES, uploadMode } from "@/lib/produktion/material";
import { saveMaterialUrl } from "@/lib/produktion/material-actions";
import { bytes, cleanFolder, MAX_MATERIAL_BYTES } from "@/lib/produktion/material-shared";

export const metadata: Metadata = { title: "Material · Produktion" };

type Params = Promise<{ clientId: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function MaterialClientPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MaterialClient params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const folderHref = (clientId: number, folder: string) => `/produktion/material/${clientId}${folder ? `?ordner=${encodeURIComponent(folder)}` : ""}`;

function FileIcon({ mime, name }: { mime: string; name: string }) {
  const cls = "size-5";
  if (mime.startsWith("image/")) return <FileImage className={cls} aria-hidden />;
  if (mime.startsWith("audio/")) return <FileAudio className={cls} aria-hidden />;
  if (mime.startsWith("video/")) return <FileVideo className={cls} aria-hidden />;
  if (mime.startsWith("font/") || /\.(ttf|otf|woff2?)$/i.test(name)) return <FileType className={cls} aria-hidden />;
  if (/zip|rar|7z|tar/.test(mime)) return <FileArchive className={cls} aria-hidden />;
  if (mime === "application/pdf" || mime.startsWith("text/")) return <FileText className={cls} aria-hidden />;
  return <File className={cls} aria-hidden />;
}

async function MaterialClient({ params, searchParams }: { params: Params; searchParams: SP }) {
  await connection();
  const clientId = Number((await params).clientId);
  const data = Number.isInteger(clientId) && clientId > 0 ? await getMaterial(clientId) : null;
  if (!data) notFound();
  const { client, files } = data;
  const folder = cleanFolder(one((await searchParams).ordner) ?? "");
  const mode = uploadMode();

  // Unterordner der aktuellen Ebene und Dateien direkt darin
  const prefix = folder ? `${folder}/` : "";
  const sub = new Map<string, { count: number; size: number }>();
  for (const f of files) {
    if (folder && f.folder !== folder && !f.folder.startsWith(prefix)) continue;
    if (f.folder === folder) continue;
    const name = f.folder.slice(prefix.length).split("/")[0];
    const s = sub.get(name) ?? { count: 0, size: 0 };
    sub.set(name, { count: s.count + 1, size: s.size + f.size });
  }
  const here = files.filter((f) => f.folder === folder);
  const inScope = files.filter((f) => !folder || f.folder === folder || f.folder.startsWith(prefix));
  const previews = await materialLinks(
    here.filter((f) => PREVIEW_TYPES.includes(f.mime)),
    { download: false, seconds: 3600 },
  );
  const crumbs = folder ? folder.split("/") : [];

  return (
    <>
      <PageHeader
        scene="Szene 04 · Produktion"
        back={{ href: "/produktion/material", label: "Material" }}
        title={client.name}
        description="Logos, Schriften, Musik und Vorlagen für den Schnitt. Ganze Ordner hochladen, als ZIP wieder laden."
        actions={inScope.length > 0 ? <ZipButton clientId={client.id} folder={folder} zipName={[client.name, ...crumbs].join(" ")} label={folder ? "Ordner als ZIP" : "Alles als ZIP"} /> : undefined}
      />

      <div className="grid gap-6">
        {crumbs.length > 0 && (
          <nav aria-label="Ordnerpfad" className="-mt-3 flex flex-wrap items-center gap-1 text-[15px]">
            <Link href={folderHref(client.id, "")} className="rounded-lg px-1.5 py-1 font-medium text-accent-ink hover:bg-fill-2">
              Alle Ordner
            </Link>
            {crumbs.map((c, i) => {
              const path = crumbs.slice(0, i + 1).join("/");
              const last = i === crumbs.length - 1;
              return (
                <span key={path} className="flex items-center gap-1">
                  <ChevronRight className="size-4 text-muted" aria-hidden />
                  {last ? (
                    <span className="px-1.5 py-1 font-semibold text-ink" aria-current="page">
                      {c}
                    </span>
                  ) : (
                    <Link href={folderHref(client.id, path)} className="rounded-lg px-1.5 py-1 font-medium text-accent-ink hover:bg-fill-2">
                      {c}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
        )}

        <MaterialUpload clientId={client.id} folder={folder} mode={mode} maxBytes={MAX_MATERIAL_BYTES[mode]} />

        {sub.size === 0 && here.length === 0 ? (
          <EmptyState icon={<FolderOpen className="size-5" />} title={folder ? "Dieser Ordner ist leer" : "Noch kein Material"}>
            Zieht zum Beispiel den Ordner mit Logos, Schriften und Musik des Kunden hierher. Die Unterordner bleiben so, wie sie sind.
          </EmptyState>
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-hairline">
              {[...sub.entries()]
                .sort(([a], [b]) => a.localeCompare(b, "de"))
                .map(([name, s]) => (
                  <li key={name}>
                    <Link href={folderHref(client.id, folder ? `${folder}/${name}` : name)} className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors hover:bg-fill-2">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-info/10 text-info">
                        <Folder className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-ink">{name}</span>
                        <span className="block text-[13px] text-muted">
                          {s.count === 1 ? "1 Datei" : `${s.count} Dateien`}, {bytes(s.size)}
                        </span>
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              {here.map((f) => (
                <FileRow key={f.id} f={f} preview={previews.get(f.id)} />
              ))}
            </ul>
          </Card>
        )}

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1 basis-80">
            <MaterialUrlForm action={saveMaterialUrl.bind(null, client.id)} value={client.materialUrl} />
            {client.materialUrl && (
              <a href={client.materialUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-accent-ink hover:underline">
                <ExternalLink className="size-4" aria-hidden /> Rohmaterial öffnen
              </a>
            )}
          </div>
          {folder && <DeleteFolderButton clientId={client.id} folder={folder} count={inScope.length} />}
        </div>
      </div>
    </>
  );
}

function FileRow({ f, preview }: { f: Material; preview?: string }) {
  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-2">
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-fill-2 text-ink-2">
        {preview ? (
          // signierte Supabase-Links bzw. eigene Route: kein next/image (keine Optimierung privater Dateien)
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" loading="lazy" className="size-full bg-[repeating-conic-gradient(#eee_0_25%,#fff_0_50%)] bg-[length:10px_10px] object-contain" />
        ) : (
          <FileIcon mime={f.mime} name={f.name} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <a href={`/api/material/${f.id}?download=1`} className="block truncate text-[15px] font-medium text-ink hover:underline" title={`${f.name} laden`}>
          {f.name}
        </a>
        <span className="block text-[13px] text-muted">
          {bytes(f.size)}, {dateShort(f.createdAt)}
        </span>
      </span>
      <DeleteMaterialButton id={f.id} name={f.name} />
    </li>
  );
}

function PageSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-24 w-full max-w-xl" />
      <Skeleton className="h-24 rounded-[var(--radius-card)]" />
      <Skeleton className="h-72 rounded-[var(--radius-card)]" />
    </div>
  );
}
