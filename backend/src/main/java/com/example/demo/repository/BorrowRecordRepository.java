package com.example.demo.repository;

import com.example.demo.model.entity.BorrowRecord;
import com.example.demo.model.enums.BorrowStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface BorrowRecordRepository extends JpaRepository<BorrowRecord, Long> {

    Page<BorrowRecord> findBySlipUserId(Long userId, Pageable pageable);

    Page<BorrowRecord> findBySlipUserIdAndStatusIn(Long userId, Collection<BorrowStatus> statuses, Pageable pageable);

    int countBySlipUserIdAndStatus(Long userId, BorrowStatus status);

    int countBySlipUserIdAndStatusIn(Long userId, Collection<BorrowStatus> statuses);

    // Check if user is already borrowing a specific book (through any copy of that book)
    @Query("SELECT COUNT(r) > 0 FROM BorrowRecord r WHERE r.slip.user.id = :userId AND r.copy.book.id = :bookId AND r.status = :status")
    boolean existsBySlipUserIdAndBookIdAndStatus(@Param("userId") Long userId, @Param("bookId") Long bookId, @Param("status") BorrowStatus status);

    @Query("SELECT COUNT(r) > 0 FROM BorrowRecord r WHERE r.slip.user.id = :userId AND r.copy.book.id = :bookId AND r.status IN :statuses")
    boolean existsBySlipUserIdAndBookIdAndStatusIn(@Param("userId") Long userId,
                                                   @Param("bookId") Long bookId,
                                                   @Param("statuses") Collection<BorrowStatus> statuses);

    // Overdue check: records where slip.dueDate < now and status = BORROWING
    @Query("SELECT r FROM BorrowRecord r JOIN r.slip s WHERE r.status = :status AND s.dueDate < :dateTime")
    List<BorrowRecord> findByStatusAndSlipDueDateBefore(@Param("status") BorrowStatus status, @Param("dateTime") LocalDateTime dateTime);

    long countByStatus(BorrowStatus status);

    @Query("SELECT r FROM BorrowRecord r WHERE r.slip.user.studentId = :studentId AND r.status IN ('BORROWING', 'OVERDUE') ORDER BY r.createdAt DESC")
    List<BorrowRecord> findActiveBorrowsByStudentId(@Param("studentId") String studentId);
}
