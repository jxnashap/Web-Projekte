// Abgleich: Kalender-Abo (iCal) und Google Kalender. Server-Komponente.
import { CalendarSync, ChevronRight, Link2, RefreshCw, Smartphone, Unplug } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { DialogButton } from "@/components/ui/dialog";
import { dateTime } from "@/lib/format";
import type { GoogleStatus } from "@/lib/google/calendar";
import { GOOGLE_CALENDAR_NAME } from "@/lib/google/calendar";
import { disconnectGoogle, renewIcalToken, syncGoogleNow } from "@/lib/kalender/actions";
import type { IcalSettings } from "@/lib/kalender/data";
import { CopyField } from "./copy-field";

const cardTitle = "text-[17px] font-semibold tracking-[-0.02em] text-ink";
const iconCircle = "grid size-9 shrink-0 place-items-center rounded-full bg-fill text-ink-2";

export function SyncPanel({ ical, origin, google, ios = false }: { ical: IcalSettings; origin: string; google: GoogleStatus; ios?: boolean }) {
  const feed = ical ? `${origin}/api/kalender/feed?token=${ical.token}` : null;
  const webcal = feed?.replace(/^https?:/, "webcal:");

  const appleSteps = webcal && (
    <section>
      <h3 className="font-semibold">iPhone und Mac</h3>
      <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-ink-2">
        <li>
          <a className="font-semibold text-accent-ink underline-offset-2 hover:underline" href={webcal}>
            Abo-Link öffnen
          </a>{" "}
          oder in Einstellungen, Kalender, Accounts, „Kalenderabo hinzufügen“ einfügen.
        </li>
        <li>Abonnieren bestätigen.</li>
      </ol>
    </section>
  );
  const googleSteps = (
    <section>
      <h3 className="font-semibold">Google Kalender</h3>
      <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-ink-2">
        <li>Link oben kopieren.</li>
        <li>calendar.google.com am Computer öffnen.</li>
        <li>Bei „Weitere Kalender“ auf Plus, dann „Per URL“.</li>
        <li>Link einfügen und „Kalender hinzufügen“.</li>
      </ol>
    </section>
  );

  return (
    <section aria-labelledby="abgleich" className="grid gap-4 md:grid-cols-2">
      <h2 id="abgleich" className="sr-only">
        Abgleich mit anderen Kalendern
      </h2>
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className={iconCircle}>
            <Link2 className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className={cardTitle}>Kalender-Abo</h3>
            <p className="mt-0.5 text-[14px] text-muted">Alle Termine im eigenen Handy- oder Google-Kalender sehen. Nur lesen, Aktualisierung etwa stündlich.</p>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2">
          {feed ? (
            <>
              <DialogButton
                label="Abonnieren"
                title="Kalender abonnieren"
                description={`Der Kalender heißt im Handy „${GOOGLE_CALENDAR_NAME}“. Der Link ist geheim: Wer ihn hat, sieht alle Termine.`}
                variant="secondary"
                dialogSize="lg"
              >
                <div className="grid gap-5 text-[14px]">
                  {ios && webcal && (
                    <a href={webcal} className={buttonClass("primary", "md", "w-full")}>
                      <Smartphone className="size-4" aria-hidden /> Auf diesem iPhone abonnieren
                    </a>
                  )}
                  <CopyField value={feed} label="Abo-Link" />
                  <div className="grid gap-5 sm:grid-cols-2">
                    {ios ? (
                      <>
                        {appleSteps}
                        {googleSteps}
                      </>
                    ) : (
                      <>
                        {googleSteps}
                        {appleSteps}
                      </>
                    )}
                  </div>
                  <p className="text-[13px] text-muted">
                    Google aktualisiert abonnierte Kalender selbst, das kann einige Stunden dauern.
                    {google.state === "verbunden" && " Für sofortige Übernahme nutzt die Google-Verbindung."}
                  </p>
                  <div className="border-t border-line pt-4">
                    <ActionButton
                      action={renewIcalToken}
                      confirm={{
                        title: "Neuen Abo-Link erzeugen?",
                        message: "Der alte Link funktioniert dann nicht mehr. Alle Abos müssen neu eingerichtet werden.",
                        confirmLabel: "Erzeugen",
                        tone: "danger",
                      }}
                      variant="danger"
                    >
                      Neuen Link erzeugen
                    </ActionButton>
                  </div>
                </div>
              </DialogButton>
              <span className="text-[13px] text-muted">Link erzeugt am {dateTime(ical!.createdAt)}</span>
            </>
          ) : (
            <ActionButton action={renewIcalToken} variant="secondary" size="md">
              Abo-Link erzeugen
            </ActionButton>
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className={iconCircle}>
            <CalendarSync className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={cardTitle}>Google Kalender</h3>
              {google.state === "verbunden" ? (
                google.settings.lastError ? <Badge tone="warn">Fehler beim Abgleich</Badge> : <Badge tone="ok">Verbunden</Badge>
              ) : google.state === "nicht_verbunden" ? (
                <Badge>Nicht verbunden</Badge>
              ) : (
                <Badge>Noch nicht eingerichtet</Badge>
              )}
            </div>
            <p className="mt-0.5 text-[14px] text-muted">
              {google.state === "verbunden"
                ? `Termine landen sofort im Kalender „${GOOGLE_CALENDAR_NAME}“. Verbunden von ${google.settings.connectedByName ?? "einem Teammitglied"} am ${dateTime(google.settings.connectedAt)}.`
                : `SCM Studio legt einen eigenen Kalender „${GOOGLE_CALENDAR_NAME}“ an und trägt Termine dort ein. Eure anderen Kalender bleiben unberührt.`}
            </p>
            {google.state === "verbunden" && google.settings.lastError && (
              <p className="mt-2 rounded-[10px] bg-warn-soft px-3 py-2 text-[13px] text-warn">
                {dateTime(google.settings.lastError.at)}: {google.settings.lastError.message}
              </p>
            )}
            {google.state === "verbunden" && google.settings.lastSyncAt && !google.settings.lastError && (
              <p className="mt-1 text-[13px] text-muted">Letzter Abgleich {dateTime(google.settings.lastSyncAt)}</p>
            )}
            {google.state === "nicht_eingerichtet" && (
              <p className="mt-2 text-[14px] text-muted">Das erledigt einmalig, wer die App betreut. Danach könnt ihr hier verbinden.</p>
            )}
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          {google.state === "nicht_eingerichtet" && (
            <Link href="/einstellungen?reiter=anbindungen" className={buttonClass("secondary")}>
              Zu den Anbindungen <ChevronRight className="size-4" aria-hidden />
            </Link>
          )}
          {google.state === "nicht_verbunden" && (
            <a href="/api/google/start" className={buttonClass("secondary")}>
              Mit Google verbinden
            </a>
          )}
          {google.state === "verbunden" && (
            <>
              <ActionButton action={syncGoogleNow} variant="secondary" size="md">
                <RefreshCw className="size-4" aria-hidden /> Jetzt abgleichen
              </ActionButton>
              <a href="/api/google/start" className={buttonClass("ghost")}>
                Neu verbinden
              </a>
              <ActionButton
                action={disconnectGoogle}
                confirm={{
                  title: "Google Kalender trennen?",
                  message: `Neue Termine werden dann nicht mehr übertragen. Der Kalender „${GOOGLE_CALENDAR_NAME}“ bleibt in eurem Google-Konto.`,
                  confirmLabel: "Trennen",
                  tone: "danger",
                }}
                variant="ghost"
                size="md"
              >
                <Unplug className="size-4" aria-hidden /> Trennen
              </ActionButton>
            </>
          )}
        </div>
      </Card>
    </section>
  );
}
