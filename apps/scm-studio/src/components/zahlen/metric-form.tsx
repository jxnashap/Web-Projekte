"use client";
// Zahlen eines Videos manuell erfassen (Gesamtstand an einem Tag, z. B. aus der Instagram-Statistik).
import { Info } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormActions, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/cn";
import { dateShort, num } from "@/lib/format";
import type { VideoOption } from "@/lib/zahlen/data";

type Props = { action: (p: ActionState, fd: FormData) => Promise<ActionState>; videos: VideoOption[]; today: string; videoId?: number | null };

// Likes und Kommentare zeigt Instagram immer an, deshalb Pflicht (leer würde die Interaktionsrate verfälschen)
const NUM_FIELDS: { name: string; label: string; hint?: string; required?: boolean; placeholder?: string }[] = [
  { name: "views", label: "Aufrufe", required: true, placeholder: "z. B. 4.100" },
  { name: "reach", label: "Reichweite", hint: "Erreichte Konten" },
  { name: "likes", label: "Likes", required: true },
  { name: "comments", label: "Kommentare", required: true },
  { name: "shares", label: "Geteilt" },
  { name: "saves", label: "Gespeichert" },
];

export function MetricForm({ action, videos, today, videoId }: Props) {
  const [selected, setSelected] = useState<string>(videoId ? String(videoId) : "");
  const [day, setDay] = useState(today);
  const groups = new Map<string, VideoOption[]>();
  for (const v of videos) groups.set(v.clientName, [...(groups.get(v.clientName) ?? []), v]);
  const last = videos.find((v) => String(v.id) === selected)?.last ?? null;
  const replaces = last && last.day === day;

  return (
    <ActionForm action={action} className="grid gap-4">
      <Field label="Video" name="videoId">
        <Select name="videoId" value={selected} onChange={(e) => setSelected(e.target.value)} required>
          <option value="" disabled>
            Video wählen
          </option>
          {[...groups.entries()].map(([client, list]) => (
            <optgroup key={client} label={client}>
              {list.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <Field label="Stand vom" name="measuredOn" hint="Gesamtstände an diesem Tag, so wie Instagram sie anzeigt.">
        <Input type="date" name="measuredOn" value={day} onChange={(e) => setDay(e.target.value)} max={today} required />
      </Field>
      {last && (
        <p
          role="status"
          className={cn("flex items-start gap-2 rounded-[10px] px-3 py-2 text-[14px]", replaces ? "bg-warn-soft text-warn" : "bg-fill-2 text-ink-2")}
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {replaces
            ? `Für den ${dateShort(last.day)} gibt es schon Werte (${num(last.views)} Aufrufe). Speichern ersetzt sie.`
            : `Letzter Stand vom ${dateShort(last.day)}: ${num(last.views)} Aufrufe`}
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {NUM_FIELDS.map((f) => (
          <Field key={f.name} label={f.label} name={f.name} optional={!f.required} hint={f.hint}>
            <Input name={f.name} inputMode="numeric" autoComplete="off" placeholder={f.placeholder} required={f.required} />
          </Field>
        ))}
      </div>
      <Field label="Ø Wiedergabezeit" name="avgWatchSeconds" optional hint="In Sekunden, z. B. 8,5">
        <Input name="avgWatchSeconds" inputMode="decimal" autoComplete="off" className="max-w-40" />
      </Field>
      <FormActions className="mt-2">
        <SubmitButton>Zahlen speichern</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

function Inner(props: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const open = sp.has("neu");
  const close = useCallback(() => {
    const next = new URLSearchParams(sp.toString());
    next.delete("neu");
    next.delete("video");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [sp, pathname, router]);
  const pre = Number(sp.get("video")) || props.videoId || null;
  return (
    <Dialog open={open} onClose={close} title="Zahlen erfassen" description="Ein Eintrag pro Video und Tag. Ein neuer Wert ersetzt den alten." size="lg">
      <MetricForm key={sp.toString()} {...props} videoId={pre} />
    </Dialog>
  );
}

/** Dialog bei ?neu=1 (optional ?video=<id>) */
export function MetricDialog(props: Props) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}
