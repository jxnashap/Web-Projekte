import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <div className="scene-label">Szene fehlt</div>
        <h1 className="display mt-2 text-[44px]">Nicht gefunden</h1>
        <p className="mt-3 text-muted">Diese Seite gibt es nicht (mehr). Vielleicht wurde der Eintrag gelöscht oder der Link ist alt.</p>
        <div className="mt-6 flex justify-center">
          <LinkButton href="/">Zur Startseite</LinkButton>
        </div>
      </div>
    </main>
  );
}
