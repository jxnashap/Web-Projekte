import { ChevronRight, FolderOpen, Link2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ProduktionTabs } from "@/components/produktion/tabs";
import { ClientAvatar } from "@/components/crm/client-avatar";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { dateShort } from "@/lib/format";
import { listMaterialClients } from "@/lib/produktion/material";
import { bytes } from "@/lib/produktion/material-shared";

export const metadata: Metadata = { title: "Material · Produktion" };

export default function MaterialPage() {
  return (
    <>
      <PageHeader
        scene="Szene 04 · Produktion"
        title="Produktion"
        description="Alles, was ihr zum Schneiden braucht: Logos, Schriften, Musik und Vorlagen je Kunde, auch als ganze Ordner."
      />
      <ProduktionTabs active="material" />
      <Suspense fallback={<ListSkeleton />}>
        <ClientList />
      </Suspense>
    </>
  );
}

async function ClientList() {
  await connection();
  const clients = await listMaterialClients();
  if (clients.length === 0)
    return (
      <EmptyState
        icon={<FolderOpen className="size-5" />}
        title="Noch keine Kunden"
        action={
          <LinkButton href="/kunden/neu" variant="secondary">
            Ersten Kunden anlegen
          </LinkButton>
        }
      >
        Material liegt immer bei einem Kunden. Legt zuerst einen Kunden an.
      </EmptyState>
    );
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {clients.map((c) => (
        <li key={c.id}>
          <Link
            href={`/produktion/material/${c.id}`}
            className="squircle flex min-h-24 items-center gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-raised)]"
          >
            <ClientAvatar client={c} size={48} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-semibold tracking-[-0.02em] text-ink">{c.name}</span>
              <span className="mt-0.5 block text-[13px] text-muted">
                {c.files === 0
                  ? "Noch leer"
                  : `${c.files === 1 ? "1 Datei" : `${c.files} Dateien`}, ${bytes(c.size)}${c.last ? `, zuletzt ${dateShort(c.last)}` : ""}`}
              </span>
              {c.materialUrl && (
                <span className="mt-0.5 flex items-center gap-1 text-[13px] text-info">
                  <Link2 className="size-3.5" aria-hidden /> Rohmaterial verlinkt
                </span>
              )}
            </span>
            <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-24 rounded-[var(--radius-card)]" />
      ))}
    </div>
  );
}
