// PDF eines Dokuments: abgelegte Fassung (final/unterschrieben) byte-genau, sonst live gerendert.
import { getCurrentUser } from "@/lib/auth";
import { getDocument } from "@/lib/dokumente/data";
import { buildRenderCtx, pdfFileName, renderDocument } from "@/lib/dokumente/render";
import { pdfResponse } from "@/lib/pdf/render";
import { readFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request, ctx: RouteContext<"/api/dokumente/[id]/pdf">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Nicht angemeldet", { status: 401 });
  const { id } = await ctx.params;
  const found = await getDocument(Number(id));
  if (!found) return new Response("Nicht gefunden", { status: 404 });
  const download = new URL(request.url).searchParams.has("download");
  const { doc, client } = found;
  const name = pdfFileName(doc);
  if (doc.fileId && doc.status !== "entwurf") {
    const file = await readFile(doc.fileId).catch(() => null);
    if (file) {
      const res = pdfResponse(file.data, name, download);
      res.headers.set("X-SHA256", file.meta.sha256);
      res.headers.set("X-Frame-Options", "SAMEORIGIN");
      return res;
    }
  }
  const data = await renderDocument(await buildRenderCtx(doc, client));
  const res = pdfResponse(data, name, download);
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  return res;
}
