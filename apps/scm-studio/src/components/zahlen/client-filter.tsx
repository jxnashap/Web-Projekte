"use client";
// Kundenfilter als Auswahl; ändert nur den Parameter "kunde" in der URL.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Select } from "@/components/ui/field";

type Opt = { id: number; name: string };

function Inner({ clients }: { clients: Opt[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="w-full sm:w-64">
      <Select
        aria-label="Kunde"
        value={sp.get("kunde") ?? ""}
        onChange={(e) => {
          const next = new URLSearchParams(sp.toString());
          if (e.target.value) next.set("kunde", e.target.value);
          else next.delete("kunde");
          const q = next.toString();
          router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
        }}
      >
        <option value="">Alle Kunden</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function ClientFilter({ clients }: { clients: Opt[] }) {
  return (
    <Suspense fallback={<div className="h-10 w-full rounded-control bg-sunken sm:w-64" />}>
      <Inner clients={clients} />
    </Suspense>
  );
}
