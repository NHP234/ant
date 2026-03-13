package com.example.demo.repository;

import com.example.demo.model.entity.BorrowRecord;
import com.example.demo.model.enums.BorrowStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface BorrowRecordRepository extends JpaRepository<BorrowRecord, Long> {

    Page<BorrowRecord> findByUserId(Long userId, Pageable pageable);

    List<BorrowRecord> findByUserIdAndStatus(Long userId, BorrowStatus status);

    int countByUserIdAndStatus(Long userId, BorrowStatus status);

    boolean existsByUserIdAndBookIdAndStatus(Long userId, Long bookId, BorrowStatus status);

    List<BorrowRecord> findByStatusAndDueDateBefore(BorrowStatus status, LocalDateTime dateTime);
}
