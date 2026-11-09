/* SSV Hafen-Manager, Mein SSV, Gast-Anmeldung, Aufnahmeantrag – Konfiguration
 *
 * modus: 'demo'      → alles läuft im Browser dieses Geräts (erfundene Beispieldaten).
 *        'supabase'  → Vereinsdatenbank (Schema: supabase/ssv-komplett.sql) mit Logins je Person.
 * supabaseAnonKey ist der öffentliche Schlüssel – er darf im Code stehen, die Rechte regelt die Datenbank.
 */
window.SSV_HAFEN_KONFIG = {
  modus: 'demo',
  supabaseUrl: '',
  supabaseAnonKey: ''
};
