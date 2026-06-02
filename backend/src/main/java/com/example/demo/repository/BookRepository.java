package com.example.demo.repository;

import com.example.demo.model.entity.Book;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface BookRepository extends JpaRepository<Book, Long> {

    Page<Book> findByTitleContainingIgnoreCase(String title, Pageable pageable);

    @Query(value = "SELECT * FROM books WHERE search_vector @@ to_tsquery('vietnamese', :query)",
            countQuery = "SELECT count(*) FROM books WHERE search_vector @@ to_tsquery('vietnamese', :query)",
            nativeQuery = true)
    Page<Book> fullTextSearch(@Param("query") String query, Pageable pageable);

    Optional<Book> findByIsbn(String isbn);

    List<Book> findByIsbnIsNullAndTitleIgnoreCase(String title);
    
    Page<Book> findByCategoriesId(Long categoryId, Pageable pageable);
    
    Page<Book> findDistinctByCategoriesInAndIdNot(java.util.Collection<com.example.demo.model.entity.Category> categories, Long id, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Book b WHERE b.id = :id")
    Optional<Book> findByIdForUpdate(@Param("id") Long id);
}
