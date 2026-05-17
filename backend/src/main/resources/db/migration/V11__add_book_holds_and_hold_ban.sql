-- ============================================================
-- V11: Add book_holds + hold ban window
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS hold_ban_until TIMESTAMP;

CREATE TABLE IF NOT EXISTS book_holds (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users(id),
    copy_id         BIGINT          NOT NULL REFERENCES book_copies(id),
    status          VARCHAR(20)     NOT NULL,
    reserved_at     TIMESTAMP       NOT NULL,
    expires_at      TIMESTAMP       NOT NULL,
    fulfilled_at    TIMESTAMP,
    canceled_at     TIMESTAMP,
    cancel_reason   TEXT,
    librarian_id    BIGINT          REFERENCES users(id),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_holds_user_status ON book_holds(user_id, status);
CREATE INDEX IF NOT EXISTS idx_book_holds_copy_id ON book_holds(copy_id);
CREATE INDEX IF NOT EXISTS idx_book_holds_expires_active ON book_holds(expires_at) WHERE status = 'ACTIVE';
