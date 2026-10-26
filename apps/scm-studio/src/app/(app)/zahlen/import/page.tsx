import { ImportWizard } from "@/components/zahlen/import-wizard";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "CSV importieren · Zahlen" };

export default function ImportPage() {
  return (
    <>
      <PageHeader
        scene="Szene 07 · Zahlen"
        back={{ href: "/zahlen", label: "Zahlen" }}
        title="CSV importieren"
        description="Viele Messwerte auf einmal übernehmen, zum Beispiel aus einer Tabelle, in der ihr die Instagram-Statistik sammelt."
      />
      <ImportWizard />
    </>
  );
}
