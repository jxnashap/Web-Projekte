// Liefert abgelegte Dateien (Belege, Rechnungen, Dokumente) nur an angemeldete Teammitglieder aus.
import { getCurrentUser } from "@/lib/auth";
import { readFile } from "@/lib/storage";

export async function GET(request: Request, ctx: RouteContext<"/api/dateien/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Nicht angemeldet", { status: 401 });
  const { id } = await ctx.params;
  const file = await readFile(Number(id)).catch(() => null);
  if (!file) return new Response("Nicht gefunden", { status: 404 });
  const download = new URL(request.url).searchParams.has("download");
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.meta.mime,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.meta.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-SHA256": file.meta.sha256,
    },
  });
}
