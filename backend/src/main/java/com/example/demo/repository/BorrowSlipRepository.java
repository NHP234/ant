package com.example.demo.repository;

import com.example.demo.model.entity.BorrowSlip;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BorrowSlipRepository extends JpaRepository<BorrowSlip, Long> {

    Page<BorrowSlip> findByUserId(Long userId, Pageable pageable);
}
