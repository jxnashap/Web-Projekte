// Alles, was ein Dokument-PDF zum Rendern braucht (reine Daten, keine Datenbank).
import type { Doc } from "@/db/schema";
import type { Company } from "@/lib/settings";
import type { DrehplanSnapshot, PartySnapshot, ReportSnapshot, SignatureEntry } from "../schema";

export type SignProof = {
  versionHash: string;
  serverTime: string;
  ip?: string;
  userAgent?: string;
  place?: string;
  capturedBy?: string | null;
  signatures: SignatureEntry[];
};

export type RenderCtx = {
  doc: Doc;
  company: Company | null;
  party: PartySnapshot | null;
  clientName: string | null;
  legalApproved: boolean;
  demo: boolean;
  drehplan?: DrehplanSnapshot;
  report?: ReportSnapshot;
  /** gesetzt beim Rendern der unterschriebenen Fassung (mit Prüfprotokoll) */
  proof?: SignProof;
};
