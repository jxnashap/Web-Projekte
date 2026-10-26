"use client";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { signAsScm } from "@/lib/dokumente/actions";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";

/** SCM unterschreibt den Vertrag vorab, der Kunde unterschreibt danach (z. B. beim Termin). */
export function ScmSign({ docId, name }: { docId: number; name: string }) {
  const pad = useRef<SignaturePadHandle>(null);
  const [empty, setEmpty] = useState(true);
  const [pending, start] = useTransition();
  const dialog = useDialog();
  return (
    <div className="grid gap-4">
      <p className="text-[14px] text-muted">Unterschrift für SCM als {name}. Der Kunde unterschreibt danach auf seinem oder eurem Gerät.</p>
      <SignaturePad ref={pad} label={name} onChange={setEmpty} />
      <div className="flex justify-end">
        <Button
          disabled={empty || pending}
          aria-busy={pending}
          onClick={() =>
            start(async () => {
              const r = await signAsScm(docId, JSON.stringify({ strokes: pad.current?.strokes() ?? [] }));
              if (r.ok) {
                toast.success(r.message ?? "Gespeichert");
                dialog?.close();
              } else toast.error(r.error ?? "Das hat nicht geklappt.");
            })
          }
        >
          {pending ? "Speichert …" : "Unterschrift speichern"}
        </Button>
      </div>
    </div>
  );
}
