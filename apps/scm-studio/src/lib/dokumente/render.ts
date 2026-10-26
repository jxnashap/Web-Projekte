// Rendert Dokumente als PDF (nur Server). Entwürfe werden live aus der Datenbank berechnet,
// finale Fassungen aus der Momentaufnahme in data (Kunde, Zahlen, Videos), damit sie stabil bleiben.
import "server-only";
import { createElement } from "react";
import type { Client, Doc } from "@/db/schema";
import { renderPdf } from "@/lib/pdf/render";
import { getCompany, isDemo, type Company } from "@/lib/settings";
import { buildDrehplanSnapshot, buildReportSnapshot, isLegalApproved, partyOf } from "./data";
import { DocumentPdf } from "./pdf";
import type { RenderCtx, SignProof } from "./pdf/types";
import type { DrehplanData, MonatsberichtData, PartySnapshot } from "./schema";

export async function buildRenderCtx(doc: Doc, client: Client | null, proof?: SignProof): Promise<RenderCtx> {
  const data = doc.data as Record<string, unknown>;
  const frozen = doc.status !== "entwurf";
  const [liveCompany, legalApproved, demo] = await Promise.all([getCompany(), isLegalApproved(), isDemo()]);
  const company = (frozen && data.companySnapshot ? (data.companySnapshot as Company) : liveCompany) ?? null;
  const party = (frozen && data.party ? (data.party as PartySnapshot) : client ? partyOf(client) : null) ?? null;
  // Prüfprotokoll einer unterschriebenen Fassung aus den gespeicherten Angaben wiederherstellen
  const stored = data.proof as Omit<SignProof, "signatures"> | undefined;
  const effectiveProof = proof ?? (doc.status === "unterschrieben" && stored ? { ...stored, signatures: (data.signatures as SignProof["signatures"]) ?? [] } : undefined);
  const ctx: RenderCtx = { doc, company, party, clientName: client?.name ?? null, legalApproved, demo, proof: effectiveProof };
  if (doc.kind === "drehplan") {
    const d = data as unknown as DrehplanData;
    ctx.drehplan = frozen && d.snapshot ? d.snapshot : await buildDrehplanSnapshot(doc.clientId, { drehtag: d.drehtag, teamIds: d.teamIds ?? [] });
  }
  if (doc.kind === "monatsbericht" && doc.clientId) {
    const d = data as unknown as MonatsberichtData;
    ctx.report = frozen && d.snapshot ? d.snapshot : await buildReportSnapshot(doc.clientId, d.month);
    ctx.demo = ctx.report.demo;
  }
  return ctx;
}

export async function renderDocument(ctx: RenderCtx): Promise<Uint8Array> {
  return renderPdf(createElement(DocumentPdf, { ctx }));
}

export function pdfFileName(doc: Doc) {
  const base = doc.title.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-");
  return `${base || "Dokument"}.pdf`;
}
