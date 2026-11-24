-- Food-safety records are append-only. Corrections are new rows that
-- reference the original via supersedes_id; nothing is ever edited in place.
--
-- A deliberate, audited purge (e.g. deleting a cancelled customer's account
-- after the retention period) can run in a transaction that first executes:
--   SET LOCAL app.allow_record_purge = 'on';
CREATE OR REPLACE FUNCTION prevent_record_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('app.allow_record_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER log_entries_append_only
  BEFORE UPDATE OR DELETE ON log_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
--> statement-breakpoint
CREATE TRIGGER corrective_actions_append_only
  BEFORE UPDATE OR DELETE ON corrective_actions
  FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
--> statement-breakpoint
CREATE TRIGGER verifications_append_only
  BEFORE UPDATE OR DELETE ON verifications
  FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
