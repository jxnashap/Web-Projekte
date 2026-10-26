"use client";
// Zahlen eines Videos manuell erfassen (Gesamtstand an einem Tag, z. B. aus der Instagram-Statistik).
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormActions, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";
import type { VideoOption } from "@/lib/zahlen/data";

type Props = { action: (p: ActionState, fd: FormData) => Promise<ActionState>; videos: VideoOption[]; today: string; videoId?: number | null };

const NUM_FIELDS: { name: string; label: string; hint?: string; required?: boolean }[] = [
  { name: "views", label: "Aufrufe", required: true },
  { name: "reach", label: "Reichweite", hint: "Erreichte Konten" },
  { name: "likes", label: "Likes" },
  { name: "comments", label: "Kommentare" },
  { name: "shares", label: "Geteilt" },
  { name: "saves", label: "Gespeichert" },
];

export function MetricForm({ action, videos, today, videoId }: Props) {
  const groups = new Map<string, VideoOption[]>();
  for (const v of videos) groups.set(v.clientName, [...(groups.get(v.clientName) ?? []), v]);
  return (
    <ActionForm action={action} className="grid gap-4">
      <Field label="Video" name="videoId">
        <Select name="videoId" defaultValue={videoId ?? ""} required>
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
      <Field label="Stand vom" name="measuredOn" hint="Die Werte sind Gesamtstände an diesem Tag, so wie Instagram sie anzeigt.">
        <Input type="date" name="measuredOn" defaultValue={today} max={today} required />
      </Field>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {NUM_FIELDS.map((f) => (
          <Field key={f.name} label={f.label} name={f.name} optional={!f.required} hint={f.hint}>
            <Input name={f.name} inputMode="numeric" autoComplete="off" placeholder={f.required ? "z. B. 4.100" : ""} required={f.required} />
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
    <Dialog open={open} onClose={close} title="Zahlen erfassen" description="Aktuellen Stand eines Videos eintragen. Gleicher Tag überschreibt den alten Eintrag." size="lg">
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
