package com.example.demo.repository;

import com.example.demo.model.entity.BookHold;
import com.example.demo.model.enums.HoldStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BookHoldRepository extends JpaRepository<BookHold, Long> {

    Page<BookHold> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUserIdAndStatusIn(Long userId, Collection<HoldStatus> statuses);

    Optional<BookHold> findByIdAndStatus(Long id, HoldStatus status);

    @Query("SELECT COUNT(h) > 0 FROM BookHold h WHERE h.user.id = :userId AND h.copy.book.id = :bookId AND h.status IN :statuses")
    boolean existsByUserIdAndBookIdAndStatusIn(@Param("userId") Long userId,
                                               @Param("bookId") Long bookId,
                                               @Param("statuses") Collection<HoldStatus> statuses);

    List<BookHold> findByStatusAndExpiresAtBefore(HoldStatus status, LocalDateTime time);
}
