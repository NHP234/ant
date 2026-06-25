-- 1. Re-define update_book_search_vector to aggregate categories (weight C) and set description to weight D
CREATE OR REPLACE FUNCTION update_book_search_vector(book_id_param BIGINT) RETURNS void AS $$
DECLARE
    authors_str TEXT;
    categories_str TEXT;
BEGIN
    SELECT COALESCE(string_agg(a.name, ', '), '') INTO authors_str
    FROM book_authors ba
    JOIN authors a ON ba.author_id = a.id
    WHERE ba.book_id = book_id_param;

    SELECT COALESCE(string_agg(c.name, ', '), '') INTO categories_str
    FROM book_categories bc
    JOIN categories c ON bc.category_id = c.id
    WHERE bc.book_id = book_id_param;

    UPDATE books b
    SET search_vector =
        setweight(to_tsvector('vietnamese', coalesce(b.title, '')), 'A') ||
        setweight(to_tsvector('vietnamese', authors_str), 'B') ||
        setweight(to_tsvector('vietnamese', categories_str), 'C') ||
        setweight(to_tsvector('vietnamese', coalesce(b.description, '')), 'D')
    WHERE b.id = book_id_param;
END;
$$ LANGUAGE plpgsql;

-- 2. Re-define books_search_vector_update trigger function for books table
CREATE OR REPLACE FUNCTION books_search_vector_update() RETURNS trigger AS $$
DECLARE
    authors_str TEXT;
    categories_str TEXT;
BEGIN
    SELECT COALESCE(string_agg(a.name, ', '), '') INTO authors_str
    FROM book_authors ba
    JOIN authors a ON ba.author_id = a.id
    WHERE ba.book_id = NEW.id;

    SELECT COALESCE(string_agg(c.name, ', '), '') INTO categories_str
    FROM book_categories bc
    JOIN categories c ON bc.category_id = c.id
    WHERE bc.book_id = NEW.id;

    NEW.search_vector :=
        setweight(to_tsvector('vietnamese', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('vietnamese', authors_str), 'B') ||
        setweight(to_tsvector('vietnamese', categories_str), 'C') ||
        setweight(to_tsvector('vietnamese', coalesce(NEW.description, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger function and trigger for book_categories table
CREATE OR REPLACE FUNCTION book_categories_search_vector_update() RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        PERFORM update_book_search_vector(NEW.book_id);
    ELSIF (TG_OP = 'DELETE') THEN
        PERFORM update_book_search_vector(OLD.book_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_book_categories_search_vector ON book_categories;

CREATE TRIGGER trg_book_categories_search_vector
    AFTER INSERT OR UPDATE OR DELETE
    ON book_categories
    FOR EACH ROW
    EXECUTE FUNCTION book_categories_search_vector_update();

-- 4. Backfill search_vector for all existing books to index categories
SELECT update_book_search_vector(id) FROM books;
