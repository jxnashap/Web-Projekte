// SSV · Edge Function „push“: Web-Push für Mitteilungen des Vereins
//   { aktion: 'schluessel' }                 → öffentlicher Schlüssel (legt das Schlüsselpaar beim ersten Aufruf an)
//   { aktion: 'senden', mitteilung_id }      → nur Funktionsträger: sendet die Mitteilung an alle passenden Abos
// Der private Schlüssel liegt in public.push_schluessel (für niemanden außer dieser Funktion lesbar).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const antwort = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { aktion, mitteilung_id } = await req.json().catch(() => ({}));

    let { data: k } = await admin.from('push_schluessel').select('public_key, private_key').eq('id', 1).maybeSingle();
    if (!k) {
      const v = webpush.generateVAPIDKeys();
      await admin.from('push_schluessel').upsert({ id: 1, public_key: v.publicKey, private_key: v.privateKey }, { onConflict: 'id', ignoreDuplicates: true });
      ({ data: k } = await admin.from('push_schluessel').select('public_key, private_key').eq('id', 1).single());
    }
    if (aktion === 'schluessel') return antwort({ public_key: k!.public_key });
    if (aktion !== 'senden') return antwort({ message: 'Unbekannte Aktion' }, 400);

    // nur Funktionsträger dürfen senden
    const nutzer = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false } });
    const { data: personal } = await nutzer.rpc('ist_personal');
    if (!personal) return antwort({ message: 'Nur für Funktionsträger' }, 403);

    const { data: m } = await admin.from('mitteilungen').select('*').eq('id', mitteilung_id).maybeSingle();
    if (!m) return antwort({ message: 'Mitteilung nicht gefunden' }, 404);

    let { data: abos } = await admin.from('push_abos').select('*');
    abos = abos ?? [];
    if (m.zielgruppe !== 'alle') {
      const { data: boote } = await admin.from('boote').select('id, eigner_id');
      let eigner = new Set((boote ?? []).map((b) => b.eigner_id));
      if (m.zielgruppe === 'liegeplatz') {
        const jahr = new Date().getFullYear();
        const { data: bel } = await admin.from('belegungen').select('boot_id').eq('periode', 'sommer').eq('platz_typ', 'wasser').gte('saison', jahr - 1);
        const ids = new Set((bel ?? []).map((b) => b.boot_id));
        eigner = new Set((boote ?? []).filter((b) => ids.has(b.id)).map((b) => b.eigner_id));
      }
      abos = abos.filter((a) => eigner.has(a.mitglied_id));
    }

    webpush.setVapidDetails('mailto:' + (Deno.env.get('PUSH_KONTAKT') ?? 'info@ssv-net.de'), k!.public_key, k!.private_key);
    const nutzlast = JSON.stringify({ id: m.id, titel: m.titel, text: m.text ?? '', wichtig: m.wichtig, url: 'mein-ssv.html' });
    let gesendet = 0, entfernt = 0, fehler = 0;
    await Promise.all(abos.map(async (a) => {
      try { await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, nutzlast, { TTL: 86400, urgency: m.wichtig ? 'high' : 'normal' }); gesendet++; }
      catch (e) { const s = (e as { statusCode?: number }).statusCode; if (s === 404 || s === 410) { entfernt++; await admin.from('push_abos').delete().eq('id', a.id); } else fehler++; }
    }));
    await admin.from('mitteilungen').update({ push_gesendet: new Date().toISOString() }).eq('id', m.id);
    return antwort({ ok: true, gesendet, entfernt, fehler });
  } catch (e) {
    return antwort({ message: (e as Error).message }, 500);
  }
});
