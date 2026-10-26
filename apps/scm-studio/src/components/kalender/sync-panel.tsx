// Abgleich: Kalender-Abo (iCal) und Google Kalender. Server-Komponente.
import { CalendarSync, Link2, RefreshCw, Unplug } from "lucide-react";
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

export function SyncPanel({ ical, origin, google }: { ical: IcalSettings; origin: string; google: GoogleStatus }) {
  const feed = ical ? `${origin}/api/kalender/feed?token=${ical.token}` : null;
  return (
    <section aria-labelledby="abgleich" className="grid gap-4 md:grid-cols-2">
      <h2 id="abgleich" className="sr-only">
        Abgleich mit anderen Kalendern
      </h2>
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-ink-2">
            <Link2 className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold">Kalender-Abo</h3>
            <p className="mt-0.5 text-[13px] text-muted">Alle Termine im eigenen Handy- oder Google-Kalender sehen. Nur lesen, Aktualisierung etwa stündlich.</p>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          {feed ? (
            <>
              <DialogButton label="Abonnieren" title="Kalender abonnieren" description="Der Link ist geheim. Wer ihn hat, sieht alle Termine." variant="secondary" size="sm" dialogSize="lg">
                <div className="grid gap-5 text-[14px]">
                  <CopyField value={feed} label="Abo-Link" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h4 className="font-semibold">Google Kalender</h4>
                      <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-ink-2">
                        <li>Link oben kopieren.</li>
                        <li>calendar.google.com am Computer öffnen.</li>
                        <li>Links bei „Weitere Kalender“ auf Plus, dann „Per URL“.</li>
                        <li>Link einfügen und „Kalender hinzufügen“.</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="font-semibold">iPhone und Mac</h4>
                      <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-ink-2">
                        <li>
                          <a className="font-semibold text-ink underline underline-offset-2" href={feed.replace(/^https?:/, "webcal:")}>
                            Diesen Link öffnen
                          </a>{" "}
                          oder in Einstellungen, Kalender, Accounts, „Kalenderabo hinzufügen“ einfügen.
                        </li>
                        <li>Abonnieren bestätigen.</li>
                      </ol>
                    </div>
                  </div>
                  <p className="text-[12px] text-muted">
                    Google aktualisiert abonnierte Kalender selbst, das kann einige Stunden dauern. Für sofortige Übernahme nutzt die Google-Verbindung rechts.
                  </p>
                  <div className="border-t border-line pt-4">
                    <ActionButton action={renewIcalToken} confirm="Neuen Link erzeugen? Der alte Link funktioniert dann nicht mehr, alle Abos müssen neu eingerichtet werden." variant="danger">
                      Neuen Link erzeugen
                    </ActionButton>
                  </div>
                </div>
              </DialogButton>
              <span className="self-center text-[12px] text-muted">Link erzeugt am {dateTime(ical!.createdAt)}</span>
            </>
          ) : (
            <ActionButton action={renewIcalToken} variant="secondary">
              Abo-Link erzeugen
            </ActionButton>
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-ink-2">
            <CalendarSync className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold">Google Kalender</h3>
              {google.state === "verbunden" ? (
                google.settings.lastError ? <Badge tone="warn">Fehler beim Abgleich</Badge> : <Badge tone="ok">Verbunden</Badge>
              ) : google.state === "nicht_verbunden" ? (
                <Badge>Nicht verbunden</Badge>
              ) : (
                <Badge>Noch nicht eingerichtet</Badge>
              )}
            </div>
            <p className="mt-0.5 text-[13px] text-muted">
              {google.state === "verbunden"
                ? `Termine landen sofort im Kalender „${GOOGLE_CALENDAR_NAME}“. Verbunden von ${google.settings.connectedByName ?? "einem Teammitglied"} am ${dateTime(google.settings.connectedAt)}.`
                : `SCM Studio legt einen eigenen Kalender „${GOOGLE_CALENDAR_NAME}“ an und trägt Termine dort ein. Eure anderen Kalender bleiben unberührt.`}
            </p>
            {google.state === "verbunden" && google.settings.lastError && (
              <p className="mt-2 rounded-lg bg-warn-soft px-3 py-2 text-[12px] text-warn">
                {dateTime(google.settings.lastError.at)}: {google.settings.lastError.message}
              </p>
            )}
            {google.state === "verbunden" && google.settings.lastSyncAt && !google.settings.lastError && (
              <p className="mt-1 text-[12px] text-muted">Letzter Abgleich {dateTime(google.settings.lastSyncAt)}</p>
            )}
            {google.state === "nicht_eingerichtet" && (
              <p className="mt-2 text-[12px] text-muted">
                Dafür braucht es ein Google-Cloud-Projekt mit OAuth-Zugang (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) und die Weiterleitungsadresse{" "}
                <code className="rounded bg-sunken px-1 font-mono text-[11px]">{google.redirectUri}</code>. Schritt für Schritt in EINRICHTUNG.md.
              </p>
            )}
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          {google.state === "nicht_verbunden" && (
            <a href="/api/google/start" className={buttonClass("primary", "sm")}>
              Mit Google verbinden
            </a>
          )}
          {google.state === "verbunden" && (
            <>
              <ActionButton action={syncGoogleNow} variant="secondary">
                <RefreshCw className="size-3.5" /> Jetzt abgleichen
              </ActionButton>
              <a href="/api/google/start" className={buttonClass("ghost", "sm")}>
                Neu verbinden
              </a>
              <ActionButton action={disconnectGoogle} confirm="Google Kalender trennen? Neue Termine werden dann nicht mehr übertragen." variant="ghost">
                <Unplug className="size-3.5" /> Trennen
              </ActionButton>
            </>
          )}
        </div>
      </Card>
    </section>
  );
}
