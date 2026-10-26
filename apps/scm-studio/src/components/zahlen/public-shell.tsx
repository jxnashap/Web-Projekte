import Image from "next/image";

/** Schlichter, heller Rahmen für öffentliche Seiten, die Kunden sehen (ohne Navigation). */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[520px]">
        <div className="mb-8 flex justify-center">
          <Image src="/logo-dark.svg" alt="SCM Creatives" width={128} height={45} priority />
        </div>
        <div className="rounded-card border border-line bg-surface p-7 shadow-card sm:p-9">{children}</div>
        <p className="mt-6 text-center text-[12px] text-muted">SCM Creatives · Social Media Videos aus Kiel und der Lübecker Bucht</p>
      </div>
    </main>
  );
}
