ALTER TABLE "studio"."documents" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "documents_deleted_idx" ON "studio"."documents" USING btree ("deleted_at");--> statement-breakpoint
-- Papierkorb für Dokumente: Löschen setzt deleted_at, nach 14 Tagen räumt /api/cron/aufraeumen endgültig auf.
-- Endgültig löschen geht nur in einer Transaktion mit set_config('studio.endgueltig', 'ja', true):
-- unterschriebene Dokumente nur, wenn sie im Papierkorb liegen, und von den Dateien nur die PDFs der Dokumente.
-- Rechnungen, Belege und Exporte bleiben wie bisher unveränderlich.
CREATE OR REPLACE FUNCTION studio.schuetze_dokument() RETURNS trigger
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'unterschrieben' THEN
    IF TG_OP = 'DELETE' THEN
      IF OLD.deleted_at IS NULL OR coalesce(current_setting('studio.endgueltig', true), '') <> 'ja' THEN
        RAISE EXCEPTION 'Unterschriebene Dokumente werden nur aus dem Papierkorb endgültig gelöscht';
      END IF;
      RETURN OLD;
    END IF;
    -- erlaubt: Widerruf vermerken, in den Papierkorb legen und wiederherstellen
    IF (NEW.kind, NEW.title, NEW.client_id, NEW.data, NEW.status, NEW.signer_name, NEW.signed_at, NEW.signature,
        NEW.sign_meta, NEW.template_version, NEW.file_id, NEW.content_hash)
       IS DISTINCT FROM
       (OLD.kind, OLD.title, OLD.client_id, OLD.data, OLD.status, OLD.signer_name, OLD.signed_at, OLD.signature,
        OLD.sign_meta, OLD.template_version, OLD.file_id, OLD.content_hash) THEN
      RAISE EXCEPTION 'Unterschriebene Dokumente sind unveränderlich (nur Widerruf möglich)';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION studio.schuetze_datei() RETURNS trigger
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.bucket = 'dokumente' AND coalesce(current_setting('studio.endgueltig', true), '') = 'ja' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'GoBD: % ist festgeschrieben und kann nicht geändert oder gelöscht werden', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER files_nur_anfuegen ON studio.files;
--> statement-breakpoint
CREATE TRIGGER files_nur_anfuegen BEFORE UPDATE OR DELETE ON studio.files
  FOR EACH ROW EXECUTE FUNCTION studio.schuetze_datei();
