-- ============================================================
-- V9: Add book_copies + borrow_slips, refactor borrow_records
-- ============================================================

-- 1. Create book_copies table
CREATE TABLE book_copies (
    id              BIGSERIAL       PRIMARY KEY,
    book_id         BIGINT          NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    copy_number     INTEGER         NOT NULL,
    nfc_tag_uid     VARCHAR(50)     UNIQUE,
    status          VARCHAR(20)     NOT NULL DEFAULT 'AVAILABLE',
    condition_note  TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (book_id, copy_number)
);

CREATE INDEX idx_book_copies_book_status ON book_copies(book_id, status);
CREATE INDEX idx_book_copies_nfc ON book_copies(nfc_tag_uid) WHERE nfc_tag_uid IS NOT NULL;

-- 2. Create borrow_slips table
CREATE TABLE borrow_slips (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users(id),
    librarian_id    BIGINT          REFERENCES users(id),
    borrow_date     TIMESTAMP       NOT NULL DEFAULT NOW(),
    due_date        TIMESTAMP       NOT NULL,
    note            TEXT,
    source          VARCHAR(20)     NOT NULL DEFAULT 'ONLINE',
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_borrow_slips_user_id ON borrow_slips(user_id);

-- 3. Populate book_copies from existing books
-- For each book, create N copies where N = quantity
INSERT INTO book_copies (book_id, copy_number, nfc_tag_uid, status, created_at)
SELECT
    b.id,
    gs.n,
    CASE WHEN gs.n = 1 THEN b.nfc_tag_uid ELSE NULL END,  -- assign existing NFC tag to copy #1
    'AVAILABLE',
    b.created_at
FROM books b
CROSS JOIN LATERAL generate_series(1, b.quantity) AS gs(n);

-- 4. Mark copies as BORROWED for active borrow records
-- For each active borrow, pick a copy and mark it BORROWED
DO $$
DECLARE
    rec RECORD;
    v_copy_id BIGINT;
BEGIN
    FOR rec IN
        SELECT br.id AS borrow_id, br.user_id, br.book_id, br.borrow_date, br.due_date
        FROM borrow_records br
        WHERE br.status IN ('BORROWING', 'OVERDUE')
    LOOP
        -- Find an available copy for this book
        SELECT bc.id INTO v_copy_id
        FROM book_copies bc
        WHERE bc.book_id = rec.book_id AND bc.status = 'AVAILABLE'
        LIMIT 1;

        IF v_copy_id IS NOT NULL THEN
            UPDATE book_copies SET status = 'BORROWED' WHERE id = v_copy_id;
        END IF;
    END LOOP;
END $$;

-- 5. Add new columns to borrow_records
ALTER TABLE borrow_records ADD COLUMN copy_id BIGINT REFERENCES book_copies(id);
ALTER TABLE borrow_records ADD COLUMN slip_id BIGINT REFERENCES borrow_slips(id);

-- 6. Migrate existing borrow_records → create slips + assign copy_id
DO $$
DECLARE
    rec RECORD;
    v_slip_id BIGINT;
    v_copy_id BIGINT;
BEGIN
    FOR rec IN
        SELECT br.id, br.user_id, br.book_id, br.borrow_date, br.due_date, br.status
        FROM borrow_records br
        ORDER BY br.id
    LOOP
        -- Create a slip for each existing record (1:1 for legacy data)
        INSERT INTO borrow_slips (user_id, borrow_date, due_date, source)
        VALUES (rec.user_id, rec.borrow_date, rec.due_date, 'ONLINE')
        RETURNING id INTO v_slip_id;

        -- Find the copy assigned to this borrow
        IF rec.status IN ('BORROWING', 'OVERDUE') THEN
            SELECT bc.id INTO v_copy_id
            FROM book_copies bc
            WHERE bc.book_id = rec.book_id AND bc.status = 'BORROWED'
            LIMIT 1;
        ELSE
            -- For returned records, just pick any copy
            SELECT bc.id INTO v_copy_id
            FROM book_copies bc
            WHERE bc.book_id = rec.book_id
            LIMIT 1;
        END IF;

        UPDATE borrow_records SET copy_id = v_copy_id, slip_id = v_slip_id WHERE id = rec.id;
    END LOOP;
END $$;

-- 7. Make copy_id NOT NULL, drop old columns from borrow_records
-- Only if there are no NULL copy_ids (safety check)
ALTER TABLE borrow_records ALTER COLUMN copy_id SET NOT NULL;
ALTER TABLE borrow_records ALTER COLUMN slip_id SET NOT NULL;
ALTER TABLE borrow_records DROP COLUMN book_id;
ALTER TABLE borrow_records DROP COLUMN borrow_date;
ALTER TABLE borrow_records DROP COLUMN due_date;

-- 8. Clean up books table
ALTER TABLE books DROP COLUMN quantity;
ALTER TABLE books DROP COLUMN available_quantity;
ALTER TABLE books DROP COLUMN nfc_tag_uid;

-- 9. Update indexes
DROP INDEX IF EXISTS idx_borrow_records_book_id;
DROP INDEX IF EXISTS idx_books_nfc_tag_uid;
CREATE INDEX idx_borrow_records_copy_id ON borrow_records(copy_id);
CREATE INDEX idx_borrow_records_slip_id ON borrow_records(slip_id);
