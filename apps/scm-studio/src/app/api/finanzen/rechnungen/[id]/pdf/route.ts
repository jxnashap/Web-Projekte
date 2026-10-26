// PDF eines Belegs: festgeschrieben = abgelegte Datei (byte-genau), Entwurf = Vorschau mit Wasserzeichen.
import { getDb } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { renderInvoiceFile, loadInvoice } from "@/lib/finanzen/workflow";
import { pdfResponse } from "@/lib/pdf/render";
import { getCompany } from "@/lib/settings";
import { readFile } from "@/lib/storage";


export async function GET(request: Request, ctx: RouteContext<"/api/finanzen/rechnungen/[id]/pdf">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Nicht angemeldet", { status: 401 });
  const { id } = await ctx.params;
  const db = await getDb();
  const loaded = await loadInvoice(db, Number(id));
  if (!loaded) return new Response("Nicht gefunden", { status: 404 });
  const { invoice, items } = loaded;
  const download = new URL(request.url).searchParams.has("download");
  if (invoice.finalizedAt && invoice.fileId) {
    const f = await readFile(invoice.fileId);
    if (!f) return new Response("Datei fehlt", { status: 500 });
    return pdfResponse(f.data, f.meta.name, download);
  }
  const data = await renderInvoiceFile(db, invoice, items, await getCompany(), true);
  return pdfResponse(data, `Entwurf-${invoice.id}.pdf`, download);
}
