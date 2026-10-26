import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthState } from "@/lib/auth";
import { authMode } from "@/lib/auth-mode";
import { AuthCard } from "../auth-card";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = { title: "Zwei-Faktor" };

async function Mfa({ searchParams }: { searchParams: Promise<{ weiter?: string }> }) {
  await connection();
  const { weiter } = await searchParams;
  const next = weiter ?? "/";
  if (authMode() !== "supabase") redirect("/login");
  const state = await getAuthState();
  if (state.status === "anonymous") redirect("/login");
  if (state.status === "ok") redirect(next);
  if (state.status === "no-team") redirect("/login?fehler=kein-team");
  return <MfaForm next={next} enroll={state.enroll} />;
}

export default function ZweiFaktorPage({ searchParams }: { searchParams: Promise<{ weiter?: string }> }) {
  return (
    <AuthCard
      scene="Klappe, die zweite"
      title="Zwei-Faktor"
      intro="Zum Schutz von Kunden- und Finanzdaten braucht jede Anmeldung zusätzlich einen Code aus eurer Authenticator-App."
    >
      <Suspense fallback={<Skeleton className="h-56" />}>
        <Mfa searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
