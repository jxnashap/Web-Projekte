"use client";
// Werkzeuge in der Material-Ansicht: Ordner als ZIP laden, Dateien und Ordner löschen, Link zum Rohmaterial.
import { Zip, ZipPassThrough } from "fflate";
import { Download, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";
import { deleteMaterial, deleteMaterialFolder, materialForZip } from "@/lib/produktion/material-actions";
import { bytes } from "@/lib/produktion/material-shared";

/** Lädt alle Dateien eines Ordners und packt sie im Browser zu einem ZIP (ohne Kompression: Logos, Musik und Schriften sind schon gepackt). */
export function ZipButton({ clientId, folder, zipName, label = "Als ZIP laden" }: { clientId: number; folder: string; zipName: string; label?: string }) {
  const [state, setState] = useState<string | null>(null);
  const run = async () => {
    setState("Bereitet vor …");
    try {
      const r = await materialForZip(clientId, folder);
      if (!r.ok) throw new Error(r.error);
      const chunks: Uint8Array[] = [];
      const zip = new Zip((err, chunk) => {
        if (err) throw err;
        chunks.push(chunk);
      });
      const total = r.entries.reduce((s, e) => s + e.size, 0);
      let loaded = 0;
      for (const [i, e] of r.entries.entries()) {
        setState(`Lädt ${i + 1} von ${r.entries.length} (${bytes(loaded)} von ${bytes(total)})`);
        const res = await fetch(e.url);
        if (!res.ok) throw new Error(`„${e.path}“ ließ sich nicht laden.`);
        const data = new Uint8Array(await res.arrayBuffer());
        const file = new ZipPassThrough(e.path);
        zip.add(file);
        file.push(data, true);
        loaded += data.byteLength;
      }
      zip.end();
      const url = URL.createObjectURL(new Blob(chunks as BlobPart[], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${zipName.replace(/[\\/:*?"<>|]+/g, "-")}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ZIP ließ sich nicht erstellen.");
    } finally {
      setState(null);
    }
  };
  return (
    <Button type="button" variant="secondary" onClick={run} disabled={state !== null} aria-busy={state !== null}>
      <Download className="size-4" aria-hidden />
      <span aria-live="polite">{state ?? label}</span>
    </Button>
  );
}

function useDelete() {
  const ask = useConfirm();
  const [pending, start] = useTransition();
  const run = async (title: string, message: string, action: () => Promise<ActionState>) => {
    if (!(await ask({ title, message, confirmLabel: "Löschen", tone: "danger" }))) return;
    start(async () => {
      const r = await action();
      if (r.ok) toast.success(r.message);
      else if (r.error) toast.error(r.error);
    });
  };
  return { pending, run };
}

export function DeleteMaterialButton({ id, name }: { id: number; name: string }) {
  const { pending, run } = useDelete();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(`„${name}“ löschen?`, "Die Datei ist danach für alle weg.", () => deleteMaterial(id))}
      className="hit grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-accent-ink disabled:opacity-40"
      title="Löschen"
    >
      <Trash2 className="size-4" aria-hidden />
      <span className="sr-only">„{name}“ löschen</span>
    </button>
  );
}

export function DeleteFolderButton({ clientId, folder, count }: { clientId: number; folder: string; count: number }) {
  const { pending, run } = useDelete();
  const name = folder.split("/").pop();
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        run(`Ordner „${name}“ löschen?`, `${count === 1 ? "1 Datei" : `Alle ${count} Dateien`} darin und in den Unterordnern sind danach für alle weg.`, () =>
          deleteMaterialFolder(clientId, folder),
        )
      }
    >
      <Trash2 className="size-4" aria-hidden /> Ordner löschen
    </Button>
  );
}

export function MaterialUrlForm({ action, value }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState>; value: string | null }) {
  return (
    <ActionForm action={action} className="grid gap-1.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Link zum Rohmaterial" name="materialUrl" optional className="min-w-0 flex-1">
          <Input type="url" name="materialUrl" inputMode="url" defaultValue={value ?? ""} placeholder="https://drive.google.com/…" />
        </Field>
        <SubmitButton variant="secondary">Speichern</SubmitButton>
      </div>
      <p className="text-[13px] text-muted">Für große Videodateien: Ordner bei Google Drive, Dropbox oder WeTransfer.</p>
    </ActionForm>
  );
}
