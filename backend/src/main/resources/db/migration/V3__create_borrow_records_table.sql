CREATE TABLE borrow_records (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users(id),
    book_id         BIGINT          NOT NULL REFERENCES books(id),
    borrow_date     TIMESTAMP       NOT NULL DEFAULT NOW(),
    due_date        TIMESTAMP       NOT NULL,
    return_date     TIMESTAMP,
    status          VARCHAR(20)     NOT NULL,
    note            TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);
