package com.example.demo.repository;

import com.example.demo.model.entity.BookCopy;
import com.example.demo.model.enums.CopyStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BookCopyRepository extends JpaRepository<BookCopy, Long> {

    List<BookCopy> findByBookIdOrderByCopyNumber(Long bookId);

    int countByBookId(Long bookId);

    int countByBookIdAndStatus(Long bookId, CopyStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM BookCopy c WHERE c.book.id = :bookId AND c.status = 'AVAILABLE' ORDER BY c.copyNumber")
    List<BookCopy> findAvailableCopiesForUpdate(@Param("bookId") Long bookId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM BookCopy c WHERE c.id = :copyId")
    Optional<BookCopy> findByIdForUpdate(@Param("copyId") Long copyId);

    Optional<BookCopy> findByNfcTagUid(String nfcTagUid);

    @Query("SELECT MAX(c.copyNumber) FROM BookCopy c WHERE c.book.id = :bookId")
    Integer findMaxCopyNumber(@Param("bookId") Long bookId);
}
