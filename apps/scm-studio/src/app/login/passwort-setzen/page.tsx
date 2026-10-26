import type { Metadata } from "next";
import { AuthCard } from "../auth-card";
import { SetPasswordForm } from "./set-form";

export const metadata: Metadata = { title: "Passwort setzen" };

export default function PasswortSetzenPage() {
  return (
    <AuthCard title="Passwort festlegen" intro="Mindestens 12 Zeichen. Danach richtet ihr den Zwei-Faktor-Code ein.">
      <SetPasswordForm />
    </AuthCard>
  );
}
