/* SSV Getränkekasse – Konfiguration
 *
 * modus: 'demo'      → alles läuft im Browser dieses Geräts (localStorage).
 *                      Ideal zum Ausprobieren, NICHT für den Echtbetrieb.
 *        'supabase'  → zentrale Datenbank (Schema: supabase/schema.sql),
 *                      z. B. Supabase in Frankfurt oder selbst betrieben.
 */
window.SSV_KONFIG = {
  modus: 'demo',
  supabaseUrl: '',      // z. B. 'https://xxxx.supabase.co'
  supabaseAnonKey: ''   // öffentlicher anon-Key (darf im Code stehen, RLS schützt)
};
