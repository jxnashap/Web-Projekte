// Einwilligung in Bild- und Videoaufnahmen (§ 22 KUG, Art. 6 Abs. 1 lit. a, Art. 7 DSGVO).
// Erklärungen in der Ich-Form (Model-Release-Stil), Hinweise in der Sie-Form: Die Personen am Set sind oft
// Gäste oder Mitarbeitende, die SCM nicht kennt; für eine rechtliche Erklärung ist die förmliche Anrede passender.
import { Text, View } from "@react-pdf/renderer";
import { KeyValues, Note, P, PdfDocument, PdfPage, s, Section, Title } from "@/lib/pdf/components";
import { MM } from "@/lib/pdf/theme";
import { consentController, consentSigners, ROLLEN, ZWECKE, zweckKeysFor, type EinwilligungData } from "../schema";
import { CheckRow, DemoNote, DRAFT_LEGAL, fmtDate, ProofPage, SignatureRow, sigFor } from "./common";
import type { RenderCtx } from "./types";

export function EinwilligungPdf({ ctx }: { ctx: RenderCtx }) {
  const d = ctx.doc.data as unknown as EinwilligungData;
  const c = ctx.company;
  const signed = ctx.doc.status === "unterschrieben" || Boolean(ctx.proof);
  const zwecke = d.zweckeBeiUnterschrift ?? d.zwecke ?? [];
  const watermark = !ctx.legalApproved ? DRAFT_LEGAL : ctx.doc.status === "entwurf" ? "Entwurf" : undefined;
  const hasClient = Boolean(ctx.doc.clientId);
  const auftraggeber = ctx.party?.name ?? ctx.clientName ?? (hasClient ? "[PLATZHALTER: Auftraggeber]" : "keiner, eigener Dreh von SCM");
  // Verantwortliche Stelle (Art. 13 DSGVO): Unvollständige Angaben erscheinen nur im Entwurf als Platzhalter,
  // freigeben und unterschreiben lässt sich die Einwilligung erst mit vollständigen Angaben.
  const ctrl = consentController(d.verantwortlich, ctx.party, c);
  const ctrlName = ctrl.name || "[PLATZHALTER: Verantwortlicher]";
  const ctrlAddress = ctrl.address || "[PLATZHALTER: Anschrift]";
  const ctrlEmail = ctrl.email || "[PLATZHALTER: E-Mail für Datenschutzfragen]";
  const sigs = ctx.proof?.signatures ?? d.signatures ?? [];
  const signers = consentSigners(d);
  const revoked = ctx.doc.revokedAt;

  return (
    <PdfDocument title={ctx.doc.title} subject="Einwilligung in Bild- und Videoaufnahmen" company={c}>
      <PdfPage company={c} kind="Einwilligung" reference={`Vorlage ${ctx.doc.templateVersion ?? ""}`} watermark={revoked ? "Widerrufen" : watermark}>
        <DemoNote show={ctx.demo} />
        <Title kicker={`Drehtag ${fmtDate(d.drehtag)}`} sub="für Fotos und Videos am Set">
          Einwilligung
        </Title>
        {revoked ? (
          <Note tone="accent">{`Diese Einwilligung wurde am ${fmtDate(new Date(revoked).toISOString())} widerrufen.${ctx.doc.revokeNote ? ` Vermerk: ${ctx.doc.revokeNote}` : ""}`}</Note>
        ) : null}
        <Section title="Angaben">
          <KeyValues
            labelWidth={120}
            rows={[
              ["Person", d.personName + (d.minderjaehrig ? " (minderjährig)" : "")],
              ["Rolle", ROLLEN[d.rolle]],
              ["Auftraggeber", auftraggeber],
              ["Produktion", `${c?.brand ?? "SCM Creatives"} (${c?.legalName ?? "SCM"})`],
              ["Drehtag und Ort", [fmtDate(d.drehtag), d.ort].filter(Boolean).join(", ")],
              ...(d.projekt ? ([["Vorhaben", d.projekt]] as [string, string][]) : []),
              ...(d.kontakt ? ([["Kontakt", d.kontakt]] as [string, string][]) : []),
            ]}
          />
        </Section>
        <Section title="Meine Einwilligung">
          <P>Ich kreuze an, wofür ich einwillige. Jede Einwilligung gilt einzeln; was ich nicht ankreuze, ist nicht erlaubt.</P>
          <View style={{ marginTop: 3 }}>
            {zweckKeysFor(hasClient).map((k) => (
              <CheckRow key={k} checked={zwecke.includes(k)} label={ZWECKE[k].label} text={ZWECKE[k].text} />
            ))}
          </View>
          {d.verguetung ? <P>{`Für meine Mitwirkung erhalte ich: ${d.verguetung}.`}</P> : null}
          <P>
            Die Einwilligung ist freiwillig. {d.rolle === "mitarbeitend" ? "Sie ist keine Voraussetzung für mein Arbeitsverhältnis, und eine Ablehnung hat für mich keine Nachteile." : "Eine Ablehnung hat für mich keine Nachteile."}
          </P>
        </Section>
        <Section title="Widerruf">
          <P>
            {`Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3 DSGVO), zum Beispiel per E-Mail an ${ctrlEmail}. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt unberührt. Nach einem Widerruf werden keine neuen Beiträge mit Ihnen veröffentlicht. Umgang mit bereits veröffentlichten Beiträgen: [PLATZHALTER: anwaltlich festlegen].`}
          </P>
        </Section>
        <Section title="Datenschutzhinweise">
          <P>{`Verantwortlich: ${ctrlName}, ${ctrlAddress}, ${ctrlEmail}.`}</P>
          <P>
            Zweck: Herstellung der Aufnahmen und deren Veröffentlichung zu den angekreuzten Zwecken. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO),
            für die Veröffentlichung von Bildnissen zusätzlich § 22 KUG.
          </P>
          <P>
            Empfänger: SCM als Produktionsfirma sowie bei Veröffentlichung die Betreiber der genutzten Plattformen (zum Beispiel Meta und TikTok). Dabei können Daten in
            Länder außerhalb der EU übermittelt werden, etwa in die USA.
          </P>
          <P>
            Speicherdauer: bis zum Widerruf oder bis der Zweck entfällt. Der Nachweis dieser Einwilligung wird aufbewahrt, solange Aufnahmen genutzt werden und darüber hinaus
            [PLATZHALTER: Frist festlegen].
          </P>
          <P>
            Ihre Rechte: Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit, Widerruf und Beschwerde bei einer
            Datenschutz-Aufsichtsbehörde. Kontakt für Datenschutzfragen: {ctrlEmail}.
          </P>
          {d.minderjaehrig ? (
            <P>
              Für Minderjährige willigen die Sorgeberechtigten ein, bei gemeinsamer Sorge beide. Ab etwa 14 Jahren stimmt die minderjährige Person zusätzlich selbst zu.
            </P>
          ) : null}
        </Section>
        <View wrap={false} style={{ marginTop: 2 * MM }}>
          <Text style={[s.h3, { marginBottom: 2 }]}>{signed ? "Unterschrieben" : "Unterschrift"}</Text>
          <SignatureRow
            boxes={signers.map((sg) => {
              const got = sigFor(sigs, sg.role);
              return { label: sg.label, name: got?.name ?? sg.name, place: ctx.proof?.place ?? d.ort ?? null, date: got ? fmtDate(got.signedAt) : null, strokes: got?.strokes };
            })}
          />
        </View>
      </PdfPage>
      <ProofPage ctx={ctx} kindLabel="Einwilligung in Bild- und Videoaufnahmen" />
    </PdfDocument>
  );
}
