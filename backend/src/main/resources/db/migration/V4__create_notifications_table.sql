CREATE TABLE notifications (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users(id),
    title           VARCHAR(255)    NOT NULL,
    message         TEXT            NOT NULL,
    type            VARCHAR(30)     NOT NULL,
    is_read         BOOLEAN         NOT NULL DEFAULT false,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);
