#!/usr/bin/env python3
"""SSV – Auslieferungspaket bauen (Website + Getränkekasse + Hafen-Manager + Startseite)

  python3 apps/ssv-hafen/tools/paket_bauen.py ZIEL demo
  python3 apps/ssv-hafen/tools/paket_bauen.py ZIEL supabase https://xxxx.supabase.co ANON_KEY

demo     – alles läuft im Browser (erfundene Beispieldaten), zum Zeigen und Ausprobieren
supabase – alle drei Teile arbeiten mit der Vereinsdatenbank (Logins je Person, Zeilenschutz)
Der anon-Key ist öffentlich (steht in jeder Supabase-Webseite); die Rechte regelt die Datenbank.
"""
import json, os, re, shutil, sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
TEILE = {'website': 'webseiten/ssv-segelverein', 'ssv-getraenke': 'apps/ssv-getraenke', 'ssv-hafen': 'apps/ssv-hafen'}
WEG = shutil.ignore_patterns('*.md', 'supabase', 'recherche', 'tools', '.DS_Store')

def konfig(pfad, variable, modus, url, key):
    s = open(pfad, encoding='utf-8').read()
    neu = "window.%s = {\n  modus: %s,\n  supabaseUrl: %s,\n  supabaseAnonKey: %s\n};" % (variable, json.dumps(modus), json.dumps(url), json.dumps(key))
    s2, n = re.subn(r"window\.%s = \{.*?\};" % variable, neu, s, flags=re.S)
    assert n == 1, pfad
    open(pfad, 'w', encoding='utf-8').write(s2)

def main():
    if len(sys.argv) < 3 or sys.argv[2] not in ('demo', 'supabase'):
        print(__doc__); sys.exit(1)
    ziel, modus = os.path.abspath(sys.argv[1]), sys.argv[2]
    url, key = (sys.argv[3], sys.argv[4]) if modus == 'supabase' else ('', '')
    if os.path.exists(ziel):
        shutil.rmtree(ziel)
    os.makedirs(ziel)
    for name, quelle in TEILE.items():
        shutil.copytree(os.path.join(REPO, quelle), os.path.join(ziel, name), ignore=WEG)
    start = open(os.path.join(REPO, 'apps/ssv-hafen/tools/startseite.html'), encoding='utf-8').read()
    if modus == 'supabase':
        konfig(os.path.join(ziel, 'ssv-getraenke/js/config.js'), 'SSV_KONFIG', modus, url, key)
        konfig(os.path.join(ziel, 'website/js/konfig.js'), 'SSV_WEB_KONFIG', modus, url, key)
        konfig(os.path.join(ziel, 'ssv-hafen/js/config.js'), 'SSV_HAFEN_KONFIG', modus, url, key)
        start = start.replace('Vorschau: Website, Getränkekasse und Hafen-Manager (Demo)', 'Website, Getränkekasse und Hafen-Manager – mit Vereinsdatenbank')
        start = re.sub(r'<code>[^<]*</code>', '', start)
        start = re.sub(r'\s*<a class="karte test".*?</a>', '', start, flags=re.S)
        start = re.sub(r'<p class="hinweis">.*?</p>', '<p class="hinweis">Anmeldung mit dem persönlichen Konto. Konten für Vorstand, Kassenwart, Brückenwartin, '
                       'Hafenmeister und Redaktion vergibt der Vorstand; Mitglieder legen ihr Konto in „Mein SSV“ selbst an.</p>', start, flags=re.S)
    open(os.path.join(ziel, 'index.html'), 'w', encoding='utf-8').write(start)
    if modus == 'demo':   # Aufgabenblatt für den Test mit Mitgliedern – nur in der Demo
        shutil.copy(os.path.join(REPO, 'apps/ssv-hafen/tools/testen.html'), os.path.join(ziel, 'testen.html'))
    # Vercel: Suchmaschinen aussperren (Vorschau), Grund-Sicherheitskopfzeilen
    json.dump({'headers': [{'source': '/(.*)', 'headers': [
        {'key': 'X-Robots-Tag', 'value': 'noindex, nofollow'},
        {'key': 'X-Content-Type-Options', 'value': 'nosniff'},
        {'key': 'Referrer-Policy', 'value': 'strict-origin-when-cross-origin'},
        {'key': 'X-Frame-Options', 'value': 'SAMEORIGIN'},
        {'key': 'Permissions-Policy', 'value': 'camera=(), microphone=(), geolocation=()'}]}]},
        open(os.path.join(ziel, 'vercel.json'), 'w'), indent=1)
    anzahl = sum(len(f) for _, _, f in os.walk(ziel))
    print('Paket', modus, '→', ziel, '(' + str(anzahl) + ' Dateien)')

if __name__ == '__main__':
    main()
