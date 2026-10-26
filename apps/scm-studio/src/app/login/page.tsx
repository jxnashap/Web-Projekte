import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getDb, schema } from "@/db";
import { getAuthState } from "@/lib/auth";
import { authMode } from "@/lib/auth-mode";
import { AuthCard } from "./auth-card";
import { EmailLoginForm, LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

type SP = Promise<{ weiter?: string; fehler?: string }>;

async function TeamLogin({ searchParams }: { searchParams: SP }) {
  await connection();
  const { weiter, fehler } = await searchParams;
  const next = weiter ?? "/";
  const state = await getAuthState();
  if (state.status === "ok") redirect(next);
  if (state.status === "mfa") redirect(`/login/zwei-faktor?weiter=${encodeURIComponent(next)}`);
  const notice = fehler === "kein-team" || state.status === "no-team" ? "Diese Adresse gehört nicht (mehr) zum Team. Bitte beim Inhaber melden." : undefined;
  if (authMode() === "supabase") return <EmailLoginForm next={next} notice={notice} />;
  const db = await getDb();
  const team = await db
    .select({ id: schema.teamMembers.id, name: schema.teamMembers.name })
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.active, true))
    .orderBy(asc(schema.teamMembers.id));
  return <LoginForm team={team} next={next} />;
}

export default function LoginPage({ searchParams }: { searchParams: SP }) {
  return (
    <AuthCard title="Bei SCM Studio anmelden" intro="Kunden, Skripte, Drehs, Zahlen und Finanzen an einem Ort.">
      <Suspense fallback={<Skeleton className="h-56" />}>
        <TeamLogin searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
