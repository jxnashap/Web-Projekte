// PDF rendern (nur Server, Node-Runtime). Ergebnis als Uint8Array für Ablage und Response.
import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";

export async function renderPdf(doc: ReactElement): Promise<Uint8Array> {
  // renderToBuffer erwartet ein <Document>-Element
  const buf = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
  return new Uint8Array(buf);
}

/** Antwort für Route Handler: inline anzeigen oder herunterladen. */
export function pdfResponse(data: Uint8Array, filename: string, download = false) {
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
