import type { Metadata } from "next";
import { AuthCard } from "../auth-card";
import { SetPasswordForm } from "./set-form";

export const metadata: Metadata = { title: "Passwort setzen" };

export default function PasswortSetzenPage() {
  return (
    <AuthCard scene="Neue Rolle" title="Passwort setzen" intro="Mindestens 12 Zeichen. Danach richtet ihr den Zwei-Faktor-Code ein.">
      <SetPasswordForm />
    </AuthCard>
  );
}
