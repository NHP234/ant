-- Keep book search vectors in sync when an existing category is renamed.
-- V14 covers book-category assignment changes; this migration covers category metadata changes.
CREATE OR REPLACE FUNCTION category_name_search_vector_update() RETURNS trigger AS $$
DECLARE
    related_book_id BIGINT;
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name) THEN
        FOR related_book_id IN
            SELECT bc.book_id
            FROM book_categories bc
            WHERE bc.category_id = NEW.id
        LOOP
            PERFORM update_book_search_vector(related_book_id);
        END LOOP;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_category_name_search_vector ON categories;

CREATE TRIGGER trg_category_name_search_vector
    AFTER UPDATE OF name
    ON categories
    FOR EACH ROW
    EXECUTE FUNCTION category_name_search_vector_update();
