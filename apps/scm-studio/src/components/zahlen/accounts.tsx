// Reiter "Konten": Instagram-Verbindung je Kunde (Stufe 2), TikTok folgt später.
import { CircleCheck, Clock, Link2, RefreshCw, Unplug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { CopyField } from "@/components/kalender/copy-field";
import { integrations } from "@/lib/env";
import { dateShort, dateTime } from "@/lib/format";
import { igRedirectUri } from "@/lib/instagram/config";
import { publicOrigin } from "@/lib/kalender/origin";
import { createConnectLink, disconnectAccount, revokeConnectLink, syncAccountNow } from "@/lib/zahlen/actions";
import { getAccountsOverview } from "@/lib/zahlen/data";

const STATUS: Record<string, { label: string; tone: "ok" | "warn" | "neutral" }> = {
  aktiv: { label: "Verbunden", tone: "ok" },
  abgelaufen: { label: "Abgelaufen", tone: "warn" },
  widerrufen: { label: "Getrennt", tone: "neutral" },
  nicht_verbunden: { label: "Nicht verbunden", tone: "neutral" },
};

export async function AccountsPanel() {
  const [clients, origin] = await Promise.all([getAccountsOverview(), publicOrigin()]);
  const ready = integrations.instagram();
  return (
    <div className="grid gap-6">
      {!ready && (
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold">Instagram-Anbindung noch nicht eingerichtet</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-muted">
            Bis dahin tragt ihr Zahlen von Hand oder per CSV ein. Für die automatische Abfrage braucht es eine Meta-App mit „Instagram API with
            Instagram Login“ (INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET) und diese Weiterleitungsadresse:
          </p>
          <code className="mt-2 inline-block rounded-md bg-sunken px-2 py-1 font-mono text-[12px] text-ink-2">{igRedirectUri(origin)}</code>
          <p className="mt-2 text-[13px] text-muted">Schritt für Schritt in EINRICHTUNG.md. Danach schickt ihr jedem Kunden einen Verbindungslink.</p>
        </Card>
      )}
      <Card>
        <CardHeader
          title="Instagram je Kunde"
          sub="Kunden geben über einen Link selbst frei (nur Lesen der Statistik). Abgleich täglich früh am Morgen und auf Knopfdruck."
        />
        <ul className="divide-y divide-line">
          {clients.map((c) => {
            const ig = c.accounts.find((a) => a.platform === "instagram");
            const st = STATUS[ig?.status ?? "nicht_verbunden"];
            const soon = ig?.expiresSoon;
            return (
              <li key={c.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: c.color }} aria-hidden />
                    <span className="font-semibold">{c.name}</span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <div className="mt-1 text-[13px] text-muted">
                    {ig?.username ? `@${ig.username}` : c.instagram ? `@${c.instagram} (laut Stammdaten)` : "Kein Instagram-Konto hinterlegt"}
                    {ig?.status === "aktiv" && (
                      <>
                        {" · "}
                        {ig.lastSyncAt ? `zuletzt abgeglichen ${dateTime(ig.lastSyncAt)}` : "noch nicht abgeglichen"}
                        {ig.tokenExpiresAt && (
                          <span className={soon ? "text-warn" : undefined}> · Zugang gültig bis {dateShort(ig.tokenExpiresAt)}</span>
                        )}
                      </>
                    )}
                  </div>
                  {c.links.map((l) => (
                    <div key={l.token} className="mt-3 grid max-w-xl gap-1.5">
                      <div className="flex items-center gap-1.5 text-[12px] text-muted">
                        <Clock className="size-3.5" aria-hidden /> Verbindungslink, gültig bis {dateTime(l.expiresAt)}
                      </div>
                      <CopyField value={`${origin}/verbinden/${l.token}`} label={`Verbindungslink für ${c.name}`} />
                      <div>
                        <ActionButton action={revokeConnectLink.bind(null, l.token)} variant="ghost" size="sm">
                          Link löschen
                        </ActionButton>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {ig?.status === "aktiv" ? (
                    <>
                      <ActionButton action={syncAccountNow.bind(null, ig.id)} variant="secondary">
                        <RefreshCw className="size-3.5" /> Jetzt abgleichen
                      </ActionButton>
                      <ActionButton action={disconnectAccount.bind(null, ig.id)} confirm={`Instagram von ${c.name} trennen? Bisherige Zahlen bleiben erhalten.`} variant="ghost">
                        <Unplug className="size-3.5" /> Trennen
                      </ActionButton>
                    </>
                  ) : !ready ? null : c.links.length === 0 ? (
                    <ActionButton action={createConnectLink.bind(null, c.id)} variant="secondary">
                      <Link2 className="size-3.5" /> Verbindungslink erzeugen
                    </ActionButton>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
                      <CircleCheck className="size-4" /> Wartet auf Freigabe durch den Kunden
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[15px] font-semibold">TikTok</h2>
          <Badge>Später</Badge>
        </div>
        <p className="mt-1 max-w-3xl text-[13px] text-muted">
          Die TikTok-Schnittstelle liefert nur Aufrufe, Likes, Kommentare und Teilen und braucht eine Prüfung durch TikTok. Bis dahin TikTok-Zahlen
          per Hand oder CSV erfassen.
        </p>
      </Card>
    </div>
  );
}
