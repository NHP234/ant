-- Enable unaccent extension (search tiếng Việt không dấu)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create text search configuration for Vietnamese (based on simple, with unaccent)
CREATE TEXT SEARCH CONFIGURATION vietnamese (COPY = simple);
ALTER TEXT SEARCH CONFIGURATION vietnamese
    ALTER MAPPING FOR asciiword, asciihword, hword_asciipart, word, hword, hword_part
    WITH unaccent, simple;

-- Add tsvector column to books
ALTER TABLE books ADD COLUMN search_vector tsvector;

-- Populate search_vector for existing data
UPDATE books SET search_vector =
    setweight(to_tsvector('vietnamese', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('vietnamese', coalesce(author, '')), 'B') ||
    setweight(to_tsvector('vietnamese', coalesce(description, '')), 'C');

-- GIN index for fast full-text search
CREATE INDEX idx_books_search_vector ON books USING GIN (search_vector);

-- Trigger to auto-update search_vector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION books_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('vietnamese', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('vietnamese', coalesce(NEW.author, '')), 'B') ||
        setweight(to_tsvector('vietnamese', coalesce(NEW.description, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_books_search_vector
    BEFORE INSERT OR UPDATE OF title, author, description
    ON books
    FOR EACH ROW
    EXECUTE FUNCTION books_search_vector_update();
