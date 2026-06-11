package com.example.demo.repository;

import com.example.demo.model.entity.BookHold;
import com.example.demo.model.enums.HoldStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BookHoldRepository extends JpaRepository<BookHold, Long> {

    Page<BookHold> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<BookHold> findByUserIdAndStatusInOrderByCreatedAtDesc(Long userId, Collection<HoldStatus> statuses, Pageable pageable);

    @Query("""
            SELECT COUNT(h)
            FROM BookHold h
            WHERE h.user.id = :userId
              AND h.status = :status
              AND h.expiresAt > :now
            """)
    long countActiveUnexpiredByUserId(@Param("userId") Long userId,
                                      @Param("status") HoldStatus status,
                                      @Param("now") LocalDateTime now);

    @Query("SELECT h.user.id FROM BookHold h WHERE h.id = :holdId")
    Optional<Long> findUserIdById(@Param("holdId") Long holdId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT h FROM BookHold h WHERE h.id = :holdId AND h.user.id = :userId")
    Optional<BookHold> findByIdAndUserIdForUpdate(@Param("holdId") Long holdId,
                                                  @Param("userId") Long userId);

    @Query("""
            SELECT COUNT(h) > 0
            FROM BookHold h
            WHERE h.user.id = :userId
              AND h.copy.book.id = :bookId
              AND h.status = :status
              AND h.expiresAt > :now
            """)
    boolean existsActiveUnexpiredByUserIdAndBookId(@Param("userId") Long userId,
                                                    @Param("bookId") Long bookId,
                                                    @Param("status") HoldStatus status,
                                                    @Param("now") LocalDateTime now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<BookHold> findFirstByUserIdAndCopyBookIdAndStatusOrderByCreatedAtDesc(
            Long userId,
            Long bookId,
            HoldStatus status
    );

    @Query("""
            SELECT h.id
            FROM BookHold h
            WHERE h.status = :status
              AND h.expiresAt <= :now
            ORDER BY h.id
            """)
    List<Long> findIdsByStatusAndExpiredAt(@Param("status") HoldStatus status,
                                           @Param("now") LocalDateTime now);
}
