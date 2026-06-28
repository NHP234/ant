package com.example.demo.repository;

import com.example.demo.model.entity.BorrowSlip;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BorrowSlipRepository extends JpaRepository<BorrowSlip, Long> {

    Page<BorrowSlip> findByUserId(Long userId, Pageable pageable);

    @Query("SELECT s FROM BorrowSlip s WHERE " +
           "LOWER(s.user.fullName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(s.user.studentId) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(s.user.username) LIKE LOWER(CONCAT('%', :q, '%'))")
    Page<BorrowSlip> searchByBorrower(@Param("q") String q, Pageable pageable);
}
