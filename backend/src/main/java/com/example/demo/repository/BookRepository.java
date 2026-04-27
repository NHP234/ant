package com.example.demo.repository;

import com.example.demo.model.entity.Book;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface BookRepository extends JpaRepository<Book, Long> {

    Page<Book> findByTitleContainingIgnoreCase(String title, Pageable pageable);

    @Query(value = "SELECT * FROM books WHERE search_vector @@ to_tsquery('vietnamese', :query)",
            countQuery = "SELECT count(*) FROM books WHERE search_vector @@ to_tsquery('vietnamese', :query)",
            nativeQuery = true)
    Page<Book> fullTextSearch(@Param("query") String query, Pageable pageable);

    Optional<Book> findByNfcTagUid(String nfcTagUid);

    Optional<Book> findByIsbn(String isbn);

    @Modifying
    @Query("UPDATE Book b SET b.availableQuantity = b.availableQuantity - 1 WHERE b.id = :bookId AND b.availableQuantity > 0")
    int decrementAvailableQuantity(@Param("bookId") Long bookId);

    @Modifying
    @Query("UPDATE Book b SET b.availableQuantity = b.availableQuantity + 1 WHERE b.id = :bookId AND b.availableQuantity < b.quantity")
    int incrementAvailableQuantity(@Param("bookId") Long bookId);
}
