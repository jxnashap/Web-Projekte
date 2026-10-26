import { requireUser } from "@/lib/auth";
import { isDemo } from "@/lib/settings";

export async function DemoBanner() {
  await requireUser();
  if (!(await isDemo())) return null;
  return (
    <div className="border-b border-warn/20 bg-warn-soft px-4 py-2 text-center text-[13px] text-warn sm:px-8">
      <strong>Vorschau mit Demo-Daten.</strong> Kunden und Reels sind echt, Pakete, Preise, Aufrufe und Finanzzahlen sind Beispielwerte.
    </div>
  );
}
