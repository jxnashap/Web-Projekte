// Drehbuch-PDF eines Skripts (nur für angemeldete Teammitglieder).
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { pdfResponse, renderPdf } from "@/lib/pdf/render";
import { getCompany } from "@/lib/settings";
import { DrehbuchPdf } from "@/lib/skripte/pdf";


export async function GET(request: Request, ctx: RouteContext<"/api/skripte/[id]/pdf">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Nicht angemeldet", { status: 401 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Ungültige ID", { status: 400 });
  const db = await getDb();
  const [row] = await db
    .select({ s: schema.scripts, clientName: schema.clients.name })
    .from(schema.scripts)
    .leftJoin(schema.clients, eq(schema.scripts.clientId, schema.clients.id))
    .where(eq(schema.scripts.id, id));
  if (!row) return new Response("Nicht gefunden", { status: 404 });
  const [video] = row.s.videoId
    ? await db
        .select({ title: schema.videos.title, status: schema.videos.status, shootDate: schema.videos.shootDate })
        .from(schema.videos)
        .where(eq(schema.videos.id, row.s.videoId))
    : [];
  const company = await getCompany();
  const pdf = await renderPdf(<DrehbuchPdf script={row.s} clientName={row.clientName} video={video ?? null} company={company} />);
  const name = `Drehbuch-${row.s.title.replace(/[^\wäöüÄÖÜß -]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || id}.pdf`;
  return pdfResponse(pdf, name, new URL(request.url).searchParams.has("download"));
}
