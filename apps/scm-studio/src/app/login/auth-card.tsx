import Image from "next/image";

/** Rahmen aller Anmeldeseiten: Logo, Szene-Label, Titel. */
export function AuthCard({ scene, title, intro, children }: { scene: string; title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex items-end gap-2">
          <Image src="/logo-dark.svg" alt="SCM Creatives" width={120} height={42} priority />
          <span className="mb-1 font-mono text-[12px] uppercase tracking-[0.12em] text-muted">Studio</span>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-7 shadow-[var(--shadow-card)]">
          <div className="scene-label flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent" /> {scene}
          </div>
          <h1 className="display mt-2 text-[34px]">{title}</h1>
          {intro && <p className="mb-6 mt-2 text-sm text-muted">{intro}</p>}
          {children}
        </div>
      </div>
    </main>
  );
}

export function FormMessage({ error, info }: { error?: string; info?: string }) {
  if (error) return <p role="alert" className="text-sm font-medium text-accent-ink">{error}</p>;
  if (info) return <p role="status" className="text-sm font-medium text-ok">{info}</p>;
  return null;
}
