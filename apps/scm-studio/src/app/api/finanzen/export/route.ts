// Downloads für die Steuerberatung: ?von=YYYY-MM-DD&bis=YYYY-MM-DD&format=extf|journal|zip&label=…
import { getCurrentUser } from "@/lib/auth";
import { buildExportZip, buildExtfFile, buildJournalFile } from "@/lib/finanzen/export";


const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Nicht angemeldet", { status: 401 });
  const sp = new URL(request.url).searchParams;
  const from = sp.get("von") ?? "";
  const to = sp.get("bis") ?? "";
  const format = sp.get("format") ?? "zip";
  const label = (sp.get("label") ?? `${from} bis ${to}`).slice(0, 60);
  if (!ISO.test(from) || !ISO.test(to) || from > to) return new Response("Zeitraum ungültig", { status: 400 });
  const headers = (type: string, name: string) => ({
    "Content-Type": type,
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
    "Cache-Control": "private, no-store",
  });
  if (format === "extf") {
    const f = await buildExtfFile(from, to, label, user.name);
    return new Response(new Uint8Array(f.data), { headers: headers("text/csv; charset=windows-1252", `EXTF_Buchungsstapel_${from}_${to}.csv`) });
  }
  if (format === "journal") {
    return new Response(new Uint8Array(await buildJournalFile(from, to)), { headers: headers("text/csv; charset=utf-8", `Journal_${from}_${to}.csv`) });
  }
  const zip = await buildExportZip(from, to, label, user.name);
  return new Response(new Uint8Array(zip.data), { headers: headers("application/zip", `Steuerberatung_${from}_${to}.zip`) });
}
