"use client";
// Material hochladen: einzelne Dateien, ganze Ordner (Unterordner bleiben erhalten) oder per Ziehen und Ablegen.
// Mit Supabase lädt der Browser direkt in den privaten Bucket (signierte Links), sonst Datei für Datei über die App.
import { FolderUp, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { finishLocalUpload, prepareMaterialUpload, registerMaterial, uploadMaterialFile } from "@/lib/produktion/material-actions";
import { bytes, isJunkFile, MAX_FILES_PER_UPLOAD, targetFolder, type UploadMode } from "@/lib/produktion/material-shared";

type Picked = { file: File; rel: string };
type Progress = { done: number; total: number; sent: number; size: number };

/** Ordner aus Ziehen und Ablegen rekursiv auslesen (Chrome, Safari, Firefox). */
async function readEntry(entry: FileSystemEntry, prefix: string, out: Picked[]) {
  if (entry.isFile) {
    const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
    out.push({ file, rel: `${prefix}${file.name}` });
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
      if (batch.length === 0) break;
      for (const e of batch) await readEntry(e, `${prefix}${entry.name}/`, out);
    }
  }
}

async function uploadSupabase(bucket: string, file: File, key: string, token: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await sb.storage.from(bucket).uploadToSignedUrl(key, token, file, {
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw new Error(error.message);
}

/** Bis zu `n` Aufgaben gleichzeitig. */
async function pool<T>(items: T[], n: number, run: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await run(items[i++]);
  }));
}

export function MaterialUpload({ clientId, folder, mode, maxBytes }: { clientId: number; folder: string; mode: UploadMode; maxBytes: number }) {
  const router = useRouter();
  const filesRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const busy = progress !== null;

  async function start(picked: Picked[]) {
    const list = picked.filter((p) => !isJunkFile(p.file.name) && p.file.size > 0);
    if (list.length === 0) return;
    if (list.length > MAX_FILES_PER_UPLOAD) return toast.error(`Höchstens ${MAX_FILES_PER_UPLOAD} Dateien auf einmal. Bitte in Teilen hochladen.`);
    const tooBig = list.filter((p) => p.file.size > maxBytes);
    const ok = list.filter((p) => p.file.size <= maxBytes);
    if (tooBig.length)
      toast.warning(
        `${tooBig.length === 1 ? `„${tooBig[0].file.name}“ ist` : `${tooBig.length} Dateien sind`} größer als ${bytes(maxBytes)} und ${tooBig.length === 1 ? "bleibt" : "bleiben"} draußen. Große Dateien gehören in den Rohmaterial-Ordner.`,
      );
    if (ok.length === 0) return;
    const size = ok.reduce((s, p) => s + p.file.size, 0);
    setProgress({ done: 0, total: ok.length, sent: 0, size });
    const tick = (p: Picked) => setProgress((x) => (x ? { ...x, done: x.done + 1, sent: x.sent + p.file.size } : x));
    let failed = 0;
    try {
      if (mode === "supabase") {
        const plan = ok.map((p) => ({ name: p.file.name, folder: targetFolder(folder, p.rel), size: p.file.size, type: p.file.type }));
        const prep = await prepareMaterialUpload(clientId, plan);
        if (!prep.ok) throw new Error(prep.error);
        const uploaded: { key: string; name: string; folder: string; type: string; size: number }[] = [];
        await pool(ok.map((p, i) => ({ p, target: prep.targets[i], plan: plan[i] })), 3, async ({ p, target, plan: pl }) => {
          try {
            await uploadSupabase(prep.bucket, p.file, target.key, target.token);
            uploaded.push({ key: target.key, ...pl });
          } catch {
            failed++;
          }
          tick(p);
        });
        const r = await registerMaterial(clientId, uploaded);
        if (r.ok) toast.success(r.message);
        else if (r.error) toast.error(r.error);
      } else {
        let count = 0;
        await pool(ok, 2, async (p) => {
          const fd = new FormData();
          fd.set("file", p.file);
          fd.set("folder", targetFolder(folder, p.rel));
          const r = await uploadMaterialFile(clientId, fd).catch(() => ({ ok: false as const, error: "Hochladen fehlgeschlagen." }));
          if (r.ok) count++;
          else failed++;
          tick(p);
        });
        const r = await finishLocalUpload(clientId, count);
        if (count > 0 && r.message) toast.success(r.message);
      }
      if (failed) toast.error(`${failed === 1 ? "1 Datei" : `${failed} Dateien`} nicht hochgeladen. Bitte noch einmal versuchen.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hochladen fehlgeschlagen.");
    } finally {
      setProgress(null);
      router.refresh();
    }
  }

  const fromInput = (input: HTMLInputElement | null) => {
    const files = Array.from(input?.files ?? []);
    if (input) input.value = "";
    void start(files.map((f) => ({ file: f, rel: f.webkitRelativePath || f.name })));
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (busy) return;
    const entries = Array.from(e.dataTransfer.items)
      .map((i) => i.webkitGetAsEntry?.())
      .filter((x): x is FileSystemEntry => Boolean(x));
    if (entries.length) {
      const out: Picked[] = [];
      for (const en of entries) await readEntry(en, "", out);
      void start(out);
    } else {
      void start(Array.from(e.dataTransfer.files).map((f) => ({ file: f, rel: f.name })));
    }
  };

  const pct = progress ? Math.round((progress.sent / Math.max(1, progress.size)) * 100) : 0;
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "squircle grid gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-line-2 bg-surface px-5 py-5 transition-colors sm:flex sm:items-center",
        over && "border-ink/40 bg-fill-2",
      )}
    >
      <input ref={filesRef} type="file" multiple hidden onChange={(e) => fromInput(e.currentTarget)} />
      <input
        ref={(el) => {
          dirRef.current = el;
          // webkitdirectory ist kein React-Attribut: direkt setzen
          el?.setAttribute("webkitdirectory", "");
        }}
        type="file"
        multiple
        hidden
        onChange={(e) => fromInput(e.currentTarget)}
      />
      <div className="min-w-0 flex-1">
        {progress ? (
          <div className="grid gap-2" role="status" aria-live="polite">
            <p className="text-[15px] font-semibold text-ink">
              Lädt hoch: {progress.done} von {progress.total}
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-fill" aria-hidden>
              <div className="h-full rounded-full bg-ink transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[13px] text-muted">
              {bytes(progress.sent)} von {bytes(progress.size)}. Bitte die Seite offen lassen.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[15px] font-semibold text-ink">Dateien oder ganze Ordner hierher ziehen</p>
            <p className="text-[13px] text-muted">
              Unterordner bleiben erhalten, gleichnamige Dateien werden ersetzt. Bis {bytes(maxBytes)} je Datei
              {folder ? `, landet in „${folder.split("/").pop()}“` : ""}.
            </p>
          </>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => filesRef.current?.click()} disabled={busy} className="max-sm:flex-1">
          <Upload className="size-4" aria-hidden /> Dateien
        </Button>
        <Button type="button" onClick={() => dirRef.current?.click()} disabled={busy} className="max-sm:flex-1">
          <FolderUp className="size-4" aria-hidden /> Ordner
        </Button>
      </div>
    </div>
  );
}
