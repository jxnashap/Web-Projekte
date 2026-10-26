import { SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-surface text-muted shadow-[var(--shadow-card)]">
        <SearchX className="size-6" />
      </div>
      <h1 className="display text-[32px]">Nicht gefunden</h1>
      <p className="mt-2 text-[16px] text-muted">Diesen Eintrag gibt es nicht (mehr). Vielleicht wurde er gelöscht oder der Link ist alt.</p>
      <div className="mt-6 flex justify-center gap-2">
        <LinkButton href="/">Zur Startseite</LinkButton>
      </div>
    </div>
  );
}
