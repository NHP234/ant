CREATE TABLE categories (
    id              BIGSERIAL       PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL UNIQUE,
    description     TEXT
);

CREATE TABLE books (
    id                  BIGSERIAL       PRIMARY KEY,
    title               VARCHAR(255)    NOT NULL,
    author              VARCHAR(255)    NOT NULL,
    isbn                VARCHAR(20)     UNIQUE,
    publisher           VARCHAR(255),
    publish_year        INTEGER,
    description         TEXT,
    quantity            INTEGER         NOT NULL DEFAULT 1,
    available_quantity  INTEGER         NOT NULL DEFAULT 1,
    nfc_tag_uid         VARCHAR(50)     UNIQUE,
    cover_image_url     VARCHAR(500),
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE TABLE book_categories (
    book_id         BIGINT          NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    category_id     BIGINT          NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, category_id)
);
