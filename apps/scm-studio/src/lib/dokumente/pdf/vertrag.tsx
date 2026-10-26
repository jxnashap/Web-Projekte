import { Text, View } from "@react-pdf/renderer";
import { Note, P, PdfDocument, PdfPage, s, Title } from "@/lib/pdf/components";
import { C, MM } from "@/lib/pdf/theme";
import type { VertragData } from "../schema";
import { buildVertragClauses, clientPartyLines, scmPartyLines } from "../vertrag-text";
import { DemoNote, DRAFT_LEGAL, fmtDate, Paragraph, ProofPage, SignatureRow, sigFor } from "./common";
import type { RenderCtx } from "./types";

function PartyBlock({ label, lines, short }: { label: string; lines: string[]; short: string }) {
  return (
    <View style={{ width: "48%" }}>
      <Text style={[s.label, { marginBottom: 4 }]}>{label}</Text>
      {lines.map((l, i) => (
        <Text key={i} style={[s.p, i === 0 ? { color: C.ink, fontWeight: 600 } : {}]}>
          {l}
        </Text>
      ))}
      <Text style={[s.small, { marginTop: 3 }]}>{`nachfolgend „${short}“`}</Text>
    </View>
  );
}

export function VertragPdf({ ctx }: { ctx: RenderCtx }) {
  const d = ctx.doc.data as unknown as VertragData;
  const clauses = buildVertragClauses(d, ctx.party, ctx.company);
  const watermark = !ctx.legalApproved ? DRAFT_LEGAL : ctx.doc.status === "entwurf" ? "Entwurf" : undefined;
  const sigs = ctx.proof?.signatures ?? d.signatures;
  const scm = sigFor(sigs, "scm") ?? d.scmSignature;
  const kunde = sigFor(sigs, "kunde");
  const signerName = d.unterzeichnerName || ctx.party?.signatoryName || "";
  return (
    <PdfDocument title={ctx.doc.title} subject="Dienstleistungsvertrag" company={ctx.company}>
      <PdfPage company={ctx.company} kind="Dienstleistungsvertrag" reference={`Vorlage ${ctx.doc.templateVersion ?? ""}`} watermark={watermark}>
        <DemoNote show={ctx.demo} />
        <Title kicker="Vertrag · Social-Media-Videos" sub={`Paket mit ${d.paketVideos} Videos pro Monat · Beginn ${fmtDate(d.beginn)}`}>
          Dienstleistungsvertrag
        </Title>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 7 * MM }}>
          <PartyBlock label="Zwischen" lines={scmPartyLines(ctx.company)} short="SCM" />
          <PartyBlock label="und" lines={clientPartyLines(ctx.party, d)} short="Auftraggeber" />
        </View>
        {!ctx.legalApproved ? (
          <Note tone="accent">
            Vorlage {ctx.doc.templateVersion}: noch nicht anwaltlich freigegeben. Vor dem ersten Einsatz von einer Fachanwältin oder einem Fachanwalt für Urheber- und
            Medienrecht prüfen lassen. Platzhalter in eckigen Klammern sind noch offen.
          </Note>
        ) : null}
        {clauses.map((c, i) => (
          <Paragraph key={c.title} n={i + 1} title={c.title} items={c.items} />
        ))}
        <View wrap={false} style={{ marginTop: 4 * MM }}>
          <P style={{ color: C.ink, fontWeight: 600 }}>Unterschriften</P>
          <SignatureRow
            boxes={[
              { label: "Für SCM", name: scm?.name ?? ctx.company?.owner ?? "", date: scm ? fmtDate(scm.signedAt) : null, place: ctx.proof?.place, strokes: scm?.strokes },
              { label: "Für den Auftraggeber", name: kunde?.name ?? signerName, date: kunde ? fmtDate(kunde.signedAt) : null, place: ctx.proof?.place, strokes: kunde?.strokes },
            ]}
          />
        </View>
      </PdfPage>
      <ProofPage ctx={ctx} kindLabel="Dienstleistungsvertrag" />
    </PdfDocument>
  );
}
