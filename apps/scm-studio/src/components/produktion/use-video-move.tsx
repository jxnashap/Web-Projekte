"use client";
// Status eines Videos ändern (Board, Liste, Schrittleiste): sofort sichtbar (optimistisch), mit „Rückgängig“ im Hinweis.
// Wechselt ein Video ohne Link auf „Online“, fragt ein kleines Blatt nach Link und Datum (für die Zahlen), mit „Später“.
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormActions, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { markOnline, setVideoStatus } from "@/lib/produktion/actions";
import { todayIso } from "@/lib/time";

type Movable = { id: number; title: string; status: string; url: string | null };

export function useVideoMove<V extends Movable>(videos: V[]) {
  const [optimistic, apply] = useOptimistic(videos, (state, m: { id: number; status: string }) =>
    state.map((v) => (v.id === m.id ? { ...v, status: m.status } : v)),
  );
  const [pending, start] = useTransition();
  const [askOnline, setAskOnline] = useState<V | null>(null);

  const commit = (id: number, status: string, previous?: string) =>
    start(async () => {
      apply({ id, status });
      const r = await setVideoStatus(id, status);
      if (r.ok) {
        toast.success(r.message, previous ? { action: { label: "Rückgängig", onClick: () => commit(id, previous) } } : undefined);
      } else toast.error(r.error ?? "Status konnte nicht geändert werden.");
    });

  const move = (id: number, status: string) => {
    const v = optimistic.find((x) => x.id === id);
    if (!v || v.status === status) return;
    if (status === "online" && !v.url) {
      setAskOnline(v);
      return;
    }
    commit(id, status, v.status);
  };

  const dialog = (
    <OnlineDialog
      video={askOnline}
      onClose={() => setAskOnline(null)}
      onSkip={() => {
        if (askOnline) commit(askOnline.id, "online", askOnline.status);
        setAskOnline(null);
      }}
    />
  );

  return { videos: optimistic, move, pending, dialog };
}

function OnlineDialog({ video, onClose, onSkip }: { video: Movable | null; onClose: () => void; onSkip: () => void }) {
  return (
    <Dialog open={Boolean(video)} onClose={onClose} title="Video ist online" description={video ? `Wo ist „${video.title}“ zu sehen? Der Link wird für die Zahlen gebraucht.` : undefined}>
      {video && (
        <ActionForm action={markOnline.bind(null, video.id)} className="grid gap-4">
          <Field label="Link zum Beitrag" name="url" optional hint="Instagram- oder TikTok-Link">
            <Input type="url" name="url" inputMode="url" autoComplete="off" placeholder="https://www.instagram.com/reel/…" />
          </Field>
          <Field label="Online seit" name="postDate">
            <Input type="date" name="postDate" defaultValue={todayIso()} />
          </Field>
          <FormActions>
            <Button type="button" variant="secondary" onClick={onSkip}>
              Später
            </Button>
            <SubmitButton>Speichern</SubmitButton>
          </FormActions>
        </ActionForm>
      )}
    </Dialog>
  );
}
