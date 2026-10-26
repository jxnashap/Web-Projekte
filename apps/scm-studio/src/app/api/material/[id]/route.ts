// Liefert Material (Logos, Schriften, Musik) nur an angemeldete Teammitglieder aus.
// Mit Supabase: Weiterleitung auf einen kurz gültigen, signierten Link direkt aus dem Bucket (große Dateien laufen nicht über Vercel).
import { getCurrentUser } from "@/lib/auth";
import { getMaterialRow, materialLinks, PREVIEW_TYPES, readLocal, uploadMode } from "@/lib/produktion/material";

export async function GET(request: Request, ctx: RouteContext<"/api/material/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Nicht angemeldet", { status: 401 });
  const { id } = await ctx.params;
  const row = await getMaterialRow(Number(id)).catch(() => null);
  if (!row) return new Response("Nicht gefunden", { status: 404 });
  const download = new URL(request.url).searchParams.has("download");

  if (uploadMode() === "supabase") {
    const url = (await materialLinks([row], { download, seconds: 60 })).get(row.id);
    return url ? Response.redirect(url, 302) : new Response("Nicht lesbar", { status: 502 });
  }
  const data = await readLocal(row.path).catch(() => null);
  if (!data) return new Response("Nicht gefunden", { status: 404 });
  const inline = !download && PREVIEW_TYPES.includes(row.mime);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": inline ? row.mime : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // SVG darf nie als Seite unserer Domain laufen
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    },
  });
}
