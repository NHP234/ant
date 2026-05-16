-- ============================================================
-- V10: Drop denormalized user_id from borrow_records
-- ============================================================

DROP INDEX IF EXISTS idx_borrow_records_user_id;
ALTER TABLE borrow_records DROP COLUMN IF EXISTS user_id;
