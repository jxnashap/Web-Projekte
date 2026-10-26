-- GoBD-Schutz in der Datenbank selbst (nicht nur in der App):
-- festgeschriebene Rechnungen, exportierte Belege, unterschriebene Dokumente, abgelegte Dateien
-- und das Änderungsprotokoll lassen sich nicht mehr verändern oder löschen.

CREATE OR REPLACE FUNCTION studio.verbiete_aenderung() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'GoBD: % ist festgeschrieben und kann nicht geändert oder gelöscht werden', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER audit_log_nur_anfuegen BEFORE UPDATE OR DELETE ON studio.audit_log
  FOR EACH ROW EXECUTE FUNCTION studio.verbiete_aenderung();
--> statement-breakpoint
CREATE TRIGGER files_nur_anfuegen BEFORE UPDATE OR DELETE ON studio.files
  FOR EACH ROW EXECUTE FUNCTION studio.verbiete_aenderung();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION studio.schuetze_rechnung() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.finalized_at IS NOT NULL THEN
      RAISE EXCEPTION 'GoBD: Beleg % ist festgeschrieben. Bitte stornieren statt löschen.', OLD.number;
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.finalized_at IS NOT NULL THEN
    -- erlaubt: Zahlungs-, Versand-, Mahn- und Statusangaben sowie interne Notiz
    IF (NEW.kind, NEW.number, NEW.client_id, NEW.recipient, NEW.title, NEW.issue_date, NEW.service_from, NEW.service_to,
        NEW.due_date, NEW.valid_until, NEW.intro, NEW.outro, NEW.net_cents, NEW.tax_cents, NEW.gross_cents, NEW.cancels_id,
        NEW.from_offer_id, NEW.buyer_reference, NEW.finalized_at, NEW.file_id, NEW.content_hash)
       IS DISTINCT FROM
       (OLD.kind, OLD.number, OLD.client_id, OLD.recipient, OLD.title, OLD.issue_date, OLD.service_from, OLD.service_to,
        OLD.due_date, OLD.valid_until, OLD.intro, OLD.outro, OLD.net_cents, OLD.tax_cents, OLD.gross_cents, OLD.cancels_id,
        OLD.from_offer_id, OLD.buyer_reference, OLD.finalized_at, OLD.file_id, OLD.content_hash) THEN
      RAISE EXCEPTION 'GoBD: Beleg % ist festgeschrieben. Korrektur nur per Storno.', OLD.number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER invoices_festschreibung BEFORE UPDATE OR DELETE ON studio.invoices
  FOR EACH ROW EXECUTE FUNCTION studio.schuetze_rechnung();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION studio.schuetze_positionen() RETURNS trigger AS $$
DECLARE fest timestamptz;
BEGIN
  SELECT finalized_at INTO fest FROM studio.invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF fest IS NOT NULL THEN
    RAISE EXCEPTION 'GoBD: Positionen einer festgeschriebenen Rechnung sind unveränderlich';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER invoice_items_festschreibung BEFORE INSERT OR UPDATE OR DELETE ON studio.invoice_items
  FOR EACH ROW EXECUTE FUNCTION studio.schuetze_positionen();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION studio.schuetze_beleg() RETURNS trigger AS $$
BEGIN
  IF OLD.exported_at IS NOT NULL THEN
    RAISE EXCEPTION 'GoBD: Beleg wurde an die Buchhaltung exportiert und ist festgeschrieben';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER expenses_festschreibung BEFORE UPDATE OR DELETE ON studio.expenses
  FOR EACH ROW EXECUTE FUNCTION studio.schuetze_beleg();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION studio.schuetze_dokument() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'unterschrieben' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Unterschriebene Dokumente werden nicht gelöscht (Nachweispflicht)';
    END IF;
    -- erlaubt: Widerruf vermerken
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
CREATE TRIGGER documents_unterschrift BEFORE UPDATE OR DELETE ON studio.documents
  FOR EACH ROW EXECUTE FUNCTION studio.schuetze_dokument();
