"use client";
// Logo hochladen: der Browser verkleinert es auf ein Quadrat (512 px, Logo vollständig sichtbar mit etwas Rand)
// und schickt nur das kleine Bild. SVG, PNG, JPG und WebP gehen, transparente Flächen bleiben transparent.
import { Camera, Trash2, Upload } from "lucide-react";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/cn";
import { deleteClientLogo, uploadClientLogo } from "@/lib/crm/logo-actions";
import { ClientAvatar } from "./client-avatar";

const SIZE = 512;

async function toSquare(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const w = img.naturalWidth || SIZE;
    const h = img.naturalHeight || SIZE;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;
    const pad = SIZE * 0.08;
    const scale = Math.min((SIZE - 2 * pad) / w, (SIZE - 2 * pad) / h);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (SIZE - w * scale) / 2, (SIZE - h * scale) / 2, w * scale, h * scale);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.92));
    if (blob && blob.type === "image/webp") return blob;
    const png = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!png) throw new Error("Bild ließ sich nicht umwandeln.");
    return png;
  } finally {
    URL.revokeObjectURL(url);
  }
}

type Client = { id: number; name: string; color: string; logoPath: string | null };

export function LogoEditor({ client, size = 56, variant = "avatar" }: { client: Client; size?: number; variant?: "avatar" | "full" }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const ask = useConfirm();

  const pick = () => input.current?.click();
  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Bitte eine Bilddatei wählen.");
    if (file.size > 20 * 1024 * 1024) return toast.error("Das Bild ist größer als 20 MB.");
    start(async () => {
      try {
        const blob = await toSquare(file);
        const fd = new FormData();
        fd.set("logo", new File([blob], `logo.${blob.type === "image/png" ? "png" : "webp"}`, { type: blob.type }));
        const r = await uploadClientLogo(client.id, fd);
        if (r.ok) toast.success(r.message);
        else toast.error(r.error ?? "Nicht gespeichert.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Das Bild ließ sich nicht lesen.");
      }
    });
  };
  const remove = async () => {
    if (!(await ask({ title: "Logo entfernen?", confirmLabel: "Entfernen", tone: "danger" }))) return;
    start(async () => {
      const r = await deleteClientLogo(client.id);
      if (r.ok) toast.success(r.message);
      else toast.error(r.error ?? "Nicht entfernt.");
    });
  };

  const fileInput = (
    <input
      ref={input}
      type="file"
      accept="image/png,image/jpeg,image/webp,image/svg+xml"
      hidden
      onChange={(e) => {
        onFile(e.currentTarget.files?.[0]);
        e.currentTarget.value = "";
      }}
    />
  );

  if (variant === "full")
    return (
      <div className="flex flex-wrap items-center gap-4">
        {fileInput}
        <ClientAvatar client={client} size={size} className={cn(pending && "opacity-50")} />
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={pick} disabled={pending}>
              <Upload className="size-4" aria-hidden /> {client.logoPath ? "Anderes Logo" : "Logo hochladen"}
            </Button>
            {client.logoPath && (
              <Button type="button" variant="ghost" onClick={remove} disabled={pending}>
                <Trash2 className="size-4" aria-hidden /> Entfernen
              </Button>
            )}
          </div>
          <p className="text-[13px] text-muted">PNG, JPG, WebP oder SVG. Wird quadratisch verkleinert, das Logo bleibt vollständig sichtbar.</p>
        </div>
      </div>
    );

  return (
    <>
      {fileInput}
      <button
        type="button"
        onClick={pick}
        disabled={pending}
        className="group relative shrink-0 rounded-[24%] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        title={client.logoPath ? "Logo ändern" : "Logo hochladen"}
      >
        <ClientAvatar client={client} size={size} className={cn(pending && "opacity-50")} />
        <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-ink text-white shadow-[var(--shadow-card)] transition-transform group-hover:scale-110">
          <Camera className="size-3.5" aria-hidden />
        </span>
        <span className="sr-only">{client.logoPath ? "Logo ändern" : "Logo hochladen"}</span>
      </button>
    </>
  );
}
