import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ImportWizard } from "@/components/zahlen/import-wizard";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "CSV importieren" };

export default function ImportPage() {
  return (
    <>
      <div className="mb-4">
        <Link href="/zahlen" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Zahlen
        </Link>
      </div>
      <PageHeader
        scene="Szene 07 · Zahlen"
        title="CSV importieren"
        description="Viele Messwerte auf einmal übernehmen, zum Beispiel aus einer Tabelle, in der ihr die Instagram-Statistik sammelt."
      />
      <ImportWizard />
    </>
  );
}
