-- Phaesto NFC Ownership Certificate System — Supabase Schema

-- Table: pieces
CREATE TABLE pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_id TEXT UNIQUE NOT NULL,
  piece_name TEXT NOT NULL,
  metal TEXT DEFAULT '925 Sterling Silver',
  weight_grams NUMERIC(5,1) NOT NULL,
  edition_number INTEGER NOT NULL,
  forge_date DATE NOT NULL,
  founder_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: ownership
CREATE TABLE ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_id TEXT REFERENCES pieces(piece_id),
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  nfc_token TEXT UNIQUE NOT NULL,
  transfer_code TEXT,
  transfer_code_expires_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ DEFAULT now(),
  is_current_owner BOOLEAN DEFAULT true
);

-- Table: transfer_log
CREATE TABLE transfer_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_id TEXT REFERENCES pieces(piece_id),
  from_owner_email TEXT,
  to_owner_email TEXT,
  transferred_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_log ENABLE ROW LEVEL SECURITY;

-- pieces: publicly readable (certificate page needs piece data)
CREATE POLICY "pieces_public_read" ON pieces FOR SELECT USING (true);

-- ownership: service role full access (all reads/writes are server-side only)
CREATE POLICY "ownership_service_select" ON ownership FOR SELECT TO service_role USING (true);
CREATE POLICY "ownership_service_insert" ON ownership FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "ownership_service_update" ON ownership FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- transfer_log: service role full access
CREATE POLICY "transfer_log_service_select" ON transfer_log FOR SELECT TO service_role USING (true);
CREATE POLICY "transfer_log_service_insert" ON transfer_log FOR INSERT TO service_role WITH CHECK (true);

-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR IF TABLES ALREADY EXIST
-- (skips CREATE TABLE, just fixes the RLS policies)
-- ============================================================
-- DROP POLICY IF EXISTS "ownership_service_select" ON ownership;
-- DROP POLICY IF EXISTS "ownership_service_insert" ON ownership;
-- DROP POLICY IF EXISTS "ownership_service_update" ON ownership;
-- DROP POLICY IF EXISTS "transfer_log_service_select" ON transfer_log;
-- DROP POLICY IF EXISTS "transfer_log_service_insert" ON transfer_log;
--
-- CREATE POLICY "ownership_service_select" ON ownership FOR SELECT TO service_role USING (true);
-- CREATE POLICY "ownership_service_insert" ON ownership FOR INSERT TO service_role WITH CHECK (true);
-- CREATE POLICY "ownership_service_update" ON ownership FOR UPDATE TO service_role USING (true) WITH CHECK (true);
-- CREATE POLICY "transfer_log_service_select" ON transfer_log FOR SELECT TO service_role USING (true);
-- CREATE POLICY "transfer_log_service_insert" ON transfer_log FOR INSERT TO service_role WITH CHECK (true);
