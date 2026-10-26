-- Feste search_path für die GoBD-Trigger-Funktionen (Supabase-Hinweis "function_search_path_mutable"):
-- sie verweisen nur auf voll qualifizierte Namen (studio.…), ein leerer Suchpfad reicht.
ALTER FUNCTION studio.verbiete_aenderung() SET search_path = '';
--> statement-breakpoint
ALTER FUNCTION studio.schuetze_rechnung() SET search_path = '';
--> statement-breakpoint
ALTER FUNCTION studio.schuetze_positionen() SET search_path = '';
--> statement-breakpoint
ALTER FUNCTION studio.schuetze_beleg() SET search_path = '';
--> statement-breakpoint
ALTER FUNCTION studio.schuetze_dokument() SET search_path = '';
