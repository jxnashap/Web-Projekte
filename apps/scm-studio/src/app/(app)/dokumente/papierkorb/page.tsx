import { RotateCcw, Trash2 } from "lucide-react";
import { Suspense } from "react";
import { KindIcon } from "@/components/dokumente/kind-icon";
import { Badge, Dot } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/ui/skeleton";
import { purgeDocument, restoreDocument } from "@/lib/dokumente/actions";
import { listTrash, type TrashRow } from "@/lib/dokumente/data";
import { docStatus, TRASH_DAYS } from "@/lib/dokumente/schema";
import { dateDe } from "@/lib/format";
import { DOC_KINDS } from "@/lib/labels";

export const metadata = { title: "Papierkorb" };

export default function PapierkorbPage() {
  return (
    <>
      <PageHeader
        scene="Szene 09 · Dokumente"
        back={{ href: "/dokumente", label: "Dokumente" }}
        title="Papierkorb"
        description={`Gelöschte Dokumente bleiben ${TRASH_DAYS} Tage hier und lassen sich wiederherstellen. Danach werden sie samt PDF endgültig gelöscht.`}
      />
      <Suspense fallback={<ListSkeleton />}>
        <TrashList />
      </Suspense>
    </>
  );
}

async function TrashList() {
  const docs = await listTrash();
  if (docs.length === 0)
    return (
      <EmptyState icon={<Trash2 className="size-5" />} title="Der Papierkorb ist leer">
        Gelöschte Dokumente landen hier und bleiben {TRASH_DAYS} Tage wiederherstellbar.
      </EmptyState>
    );
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-hairline">
        {docs.map((d) => (
          <TrashItem key={d.id} d={d} />
        ))}
      </ul>
    </Card>
  );
}

function TrashItem({ d }: { d: TrashRow }) {
  const s = docStatus(d.kind, d.status, d.revokedAt);
  const kindLabel = DOC_KINDS[d.kind]?.label ?? d.kind;
  const left = d.daysLeft === 0 ? "wird heute Nacht endgültig gelöscht" : d.daysLeft === 1 ? "noch 1 Tag" : `noch ${d.daysLeft} Tage`;
  return (
    <li className="flex flex-wrap items-center gap-x-3.5 gap-y-3 px-4 py-3 sm:flex-nowrap sm:px-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-fill-2 text-muted">
        <KindIcon kind={d.kind} className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1 basis-48">
        <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">{d.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
          <Badge tone={s.tone}>{s.label}</Badge>
          {!d.title.startsWith(kindLabel) && <span>{kindLabel}</span>}
          {d.clientName && !d.title.includes(d.clientName) && (
            <span className="inline-flex items-center gap-1.5">
              <Dot color={d.clientColor ?? "var(--color-line-2)"} /> {d.clientName}
            </span>
          )}
          <span>
            gelöscht {dateDe(d.deletedAt!)}, {left}
          </span>
        </span>
      </span>
      <span className="flex shrink-0 gap-2 max-sm:w-full max-sm:[&>*]:min-w-0 max-sm:[&>*]:flex-1">
        <ActionButton action={restoreDocument.bind(null, d.id)} variant="secondary" size="md">
          <RotateCcw className="size-4 shrink-0" /> Wiederherstellen
        </ActionButton>
        <ActionButton
          action={purgeDocument.bind(null, d.id)}
          variant="danger"
          size="md"
          title="Endgültig löschen"
          confirm={{
            title: "Endgültig löschen?",
            message:
              d.status === "unterschrieben"
                ? `„${d.title}“ wird samt unterschriebenem PDF sofort gelöscht. Das lässt sich nicht rückgängig machen, der Nachweis der Unterschrift ist danach weg.`
                : `„${d.title}“ wird samt PDF sofort gelöscht. Das lässt sich nicht rückgängig machen.`,
            confirmLabel: "Endgültig löschen",
            tone: "danger",
          }}
        >
          <Trash2 className="size-4 shrink-0" />{" "}
          <span className="sm:sr-only">
            <span className="sm:hidden">Löschen</span>
            <span className="max-sm:hidden">Endgültig löschen</span>
          </span>
        </ActionButton>
      </span>
    </li>
  );
}
