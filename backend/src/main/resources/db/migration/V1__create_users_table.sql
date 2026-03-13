CREATE TABLE users (
    id              BIGSERIAL       PRIMARY KEY,
    username        VARCHAR(50)     NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    email           VARCHAR(100)    NOT NULL UNIQUE,
    full_name       VARCHAR(100)    NOT NULL,
    role            VARCHAR(20)     NOT NULL,
    student_id      VARCHAR(20)     UNIQUE,
    nfc_card_uid    VARCHAR(50)     UNIQUE,
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);
