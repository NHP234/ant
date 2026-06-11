package com.example.demo.repository;

import com.example.demo.model.entity.BorrowRecord;
import com.example.demo.model.enums.BorrowStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BorrowRecordRepository extends JpaRepository<BorrowRecord, Long> {

    Page<BorrowRecord> findBySlipUserId(Long userId, Pageable pageable);

    Page<BorrowRecord> findBySlipUserIdAndStatusIn(Long userId, Collection<BorrowStatus> statuses, Pageable pageable);

    int countBySlipUserIdAndStatusIn(Long userId, Collection<BorrowStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM BorrowRecord r WHERE r.id = :recordId")
    Optional<BorrowRecord> findByIdForUpdate(@Param("recordId") Long recordId);

    @Query("SELECT COUNT(r) > 0 FROM BorrowRecord r WHERE r.slip.user.id = :userId AND r.copy.book.id = :bookId AND r.status IN :statuses")
    boolean existsBySlipUserIdAndBookIdAndStatusIn(@Param("userId") Long userId,
                                                   @Param("bookId") Long bookId,
                                                   @Param("statuses") Collection<BorrowStatus> statuses);

    // Overdue check: records where slip.dueDate < now and status = BORROWING
    @Query("SELECT r FROM BorrowRecord r JOIN r.slip s WHERE r.status = :status AND s.dueDate < :dateTime")
    List<BorrowRecord> findByStatusAndSlipDueDateBefore(@Param("status") BorrowStatus status, @Param("dateTime") LocalDateTime dateTime);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT r
            FROM BorrowRecord r
            JOIN r.slip s
            WHERE r.status = :status
              AND s.dueDate < :dateTime
            ORDER BY r.id
            """)
    List<BorrowRecord> findByStatusAndSlipDueDateBeforeForUpdate(
            @Param("status") BorrowStatus status,
            @Param("dateTime") LocalDateTime dateTime);

    long countByStatus(BorrowStatus status);

    @Query("SELECT r FROM BorrowRecord r WHERE r.slip.user.studentId = :studentId AND r.status IN ('BORROWING', 'OVERDUE') ORDER BY r.createdAt DESC")
    List<BorrowRecord> findActiveBorrowsByStudentId(@Param("studentId") String studentId);
}
