import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getDb, schema } from "@/db";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

async function TeamLogin({ searchParams }: { searchParams: Promise<{ weiter?: string }> }) {
  await connection();
  const { weiter } = await searchParams;
  const db = await getDb();
  const team = await db.select({ id: schema.teamMembers.id, name: schema.teamMembers.name }).from(schema.teamMembers).orderBy(asc(schema.teamMembers.id));
  return <LoginForm team={team} next={weiter ?? "/"} />;
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ weiter?: string }> }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex items-end gap-2">
          <Image src="/logo-dark.svg" alt="SCM Creatives" width={120} height={42} priority />
          <span className="mb-1 font-mono text-[12px] uppercase tracking-[0.12em] text-muted">Studio</span>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-7 shadow-[var(--shadow-card)]">
          <div className="scene-label flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent" /> Klappe, die erste
          </div>
          <h1 className="display mt-2 text-[34px]">Anmelden</h1>
          <p className="mb-6 mt-2 text-sm text-muted">Kunden, Skripte, Drehs, Zahlen und Finanzen von SCM Creatives.</p>
          <Suspense fallback={<Skeleton className="h-56" />}>
            <TeamLogin searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
