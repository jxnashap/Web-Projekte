import { AppIcon } from "@/components/shell/brand";

/** Rahmen aller Anmeldeseiten im Stil der Apple-Anmeldung: großes App-Icon, Titel, schlichte Karte. */
export function AuthCard({ scene, title, intro, children }: { scene?: string; title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  void scene;
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(120%_80%_at_50%_-10%,#ffffff_0%,var(--color-canvas)_60%)] px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <AppIcon size={76} className="drop-shadow-[0_10px_24px_rgb(0_0_0/0.22)]" />
          <h1 className="display mt-5 text-[30px]">{title}</h1>
          {intro && <p className="mt-2 max-w-[320px] text-[15px] leading-snug text-muted">{intro}</p>}
        </div>
        <div className="squircle rounded-[22px] bg-surface p-6 shadow-[var(--shadow-raised)] sm:p-7">{children}</div>
        <p className="mt-6 text-center text-[12px] text-faint">SCM Studio · SCM Creatives, Kiel und Lübecker Bucht</p>
      </div>
    </main>
  );
}

export function FormMessage({ error, info }: { error?: string; info?: string }) {
  if (error) return <p role="alert" className="rounded-[10px] bg-accent-soft px-3 py-2 text-[14px] font-medium text-accent-ink">{error}</p>;
  if (info) return <p role="status" className="rounded-[10px] bg-ok-soft px-3 py-2 text-[14px] font-medium text-ok">{info}</p>;
  return null;
}
