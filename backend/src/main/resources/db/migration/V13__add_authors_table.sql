-- 1. Create authors table
CREATE TABLE authors (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_authors_name ON authors(name);

-- 2. Create book_authors join table
CREATE TABLE book_authors (
    book_id BIGINT REFERENCES books(id) ON DELETE CASCADE,
    author_id BIGINT REFERENCES authors(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, author_id)
);

CREATE INDEX idx_book_authors_book ON book_authors(book_id);
CREATE INDEX idx_book_authors_author ON book_authors(author_id);

-- 3. Migrate existing authors to the new table
INSERT INTO authors (name)
SELECT DISTINCT author FROM books WHERE author IS NOT NULL;

-- 4. Populate book_authors mapping
INSERT INTO book_authors (book_id, author_id)
SELECT b.id, a.id
FROM books b
JOIN authors a ON b.author = a.name
WHERE b.author IS NOT NULL;

-- 5. Drop old index on books(author) and trigger that depends on author column
DROP INDEX IF EXISTS idx_books_author;
DROP TRIGGER IF EXISTS trg_books_search_vector ON books;

-- 6. Drop old author column
ALTER TABLE books DROP COLUMN author;

-- 7. Define helper function to update book search vector
CREATE OR REPLACE FUNCTION update_book_search_vector(book_id_param BIGINT) RETURNS void AS $$
DECLARE
    authors_str TEXT;
BEGIN
    SELECT COALESCE(string_agg(a.name, ', '), '') INTO authors_str
    FROM book_authors ba
    JOIN authors a ON ba.author_id = a.id
    WHERE ba.book_id = book_id_param;

    UPDATE books b
    SET search_vector =
        setweight(to_tsvector('vietnamese', coalesce(b.title, '')), 'A') ||
        setweight(to_tsvector('vietnamese', authors_str), 'B') ||
        setweight(to_tsvector('vietnamese', coalesce(b.description, '')), 'C')
    WHERE b.id = book_id_param;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger function and trigger for book_authors
CREATE OR REPLACE FUNCTION book_authors_search_vector_update() RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        PERFORM update_book_search_vector(NEW.book_id);
    ELSIF (TG_OP = 'DELETE') THEN
        PERFORM update_book_search_vector(OLD.book_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_book_authors_search_vector
    AFTER INSERT OR UPDATE OR DELETE
    ON book_authors
    FOR EACH ROW
    EXECUTE FUNCTION book_authors_search_vector_update();

-- 9. Re-define trigger function and trigger for books (without author column)
CREATE OR REPLACE FUNCTION books_search_vector_update() RETURNS trigger AS $$
DECLARE
    authors_str TEXT;
BEGIN
    SELECT COALESCE(string_agg(a.name, ', '), '') INTO authors_str
    FROM book_authors ba
    JOIN authors a ON ba.author_id = a.id
    WHERE ba.book_id = NEW.id;

    NEW.search_vector :=
        setweight(to_tsvector('vietnamese', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('vietnamese', authors_str), 'B') ||
        setweight(to_tsvector('vietnamese', coalesce(NEW.description, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_books_search_vector ON books;

CREATE TRIGGER trg_books_search_vector
    BEFORE INSERT OR UPDATE OF title, description
    ON books
    FOR EACH ROW
    EXECUTE FUNCTION books_search_vector_update();
