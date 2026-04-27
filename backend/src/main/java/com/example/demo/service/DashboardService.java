package com.example.demo.service;

import com.example.demo.dto.response.DashboardStatsResponse;
import com.example.demo.model.enums.BorrowStatus;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.BorrowRecordRepository;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final BorrowRecordRepository borrowRecordRepository;
    private final CategoryRepository categoryRepository;

    @Cacheable(value = "dashboardStats", key = "'stats'")
    public DashboardStatsResponse getStats() {
        return DashboardStatsResponse.builder()
                .totalBooks(bookRepository.count())
                .totalUsers(userRepository.count())
                .activeBorrows(borrowRecordRepository.countByStatus(BorrowStatus.BORROWING))
                .overdueBooks(borrowRecordRepository.countByStatus(BorrowStatus.OVERDUE))
                .totalCategories(categoryRepository.count())
                .build();
    }
}
