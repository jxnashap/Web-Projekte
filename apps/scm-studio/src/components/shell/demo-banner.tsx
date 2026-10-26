import { requireUser } from "@/lib/auth";
import { isDemo } from "@/lib/settings";

export async function DemoBanner() {
  await requireUser();
  if (!(await isDemo())) return null;
  return (
    <div className="px-4 pt-3 sm:px-8">
      <p className="mx-auto flex max-w-[1360px] items-start gap-2 rounded-[12px] bg-warn-soft px-3.5 py-2 text-[13px] text-warn">
        <span className="mt-[5px] size-1.5 shrink-0 rounded-full bg-warn" aria-hidden />
        <span>
          <strong className="font-semibold">Vorschau mit Demo-Daten.</strong>{" "}
          <span className="sm:hidden">Preise und Zahlen sind Beispiele.</span>
          <span className="hidden sm:inline">Kunden und Reels sind echt, Pakete, Preise, Aufrufe und Finanzzahlen sind Beispielwerte.</span>
        </span>
      </p>
    </div>
  );
}
