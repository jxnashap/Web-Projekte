import type { Metadata } from "next";
import { AuthCard } from "../auth-card";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Passwort vergessen" };

export default function PasswortVergessenPage() {
  return (
    <AuthCard title="Passwort vergessen" intro="Gebt eure Team-Adresse ein. Ihr bekommt einen Link, um ein neues Passwort zu setzen.">
      <ResetForm />
    </AuthCard>
  );
}
