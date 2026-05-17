-- ============================================================
-- V12: Update borrow_slips.source from ONLINE to COUNTER
-- ============================================================

UPDATE borrow_slips
SET source = 'COUNTER'
WHERE source = 'ONLINE';

ALTER TABLE borrow_slips
    ALTER COLUMN source SET DEFAULT 'COUNTER';
