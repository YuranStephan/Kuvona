-- payment_events and audit_events are ledgers: rows may be inserted, never changed or removed.
CREATE OR REPLACE FUNCTION kuvona_reject_ledger_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'append-only ledger: % on % is not allowed', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER payment_events_append_only
  BEFORE UPDATE OR DELETE ON payment_events
  FOR EACH ROW EXECUTE FUNCTION kuvona_reject_ledger_change();
--> statement-breakpoint
CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION kuvona_reject_ledger_change();
