package com.example.demo.service;

import com.example.demo.exception.BorrowLimitExceededException;
import com.example.demo.model.enums.BorrowStatus;
import com.example.demo.model.enums.HoldStatus;
import com.example.demo.repository.BookHoldRepository;
import com.example.demo.repository.BorrowRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BorrowPolicyService {

    private static final List<BorrowStatus> ACTIVE_BORROW_STATUSES =
            List.of(BorrowStatus.BORROWING, BorrowStatus.OVERDUE);

    private final BorrowRecordRepository borrowRecordRepository;
    private final BookHoldRepository bookHoldRepository;

    @Value("${app.borrow.max-books-per-user}")
    private int maxBooksPerUser;

    public void ensureCanCreateHold(Long userId, Long bookId, LocalDateTime now) {
        ensureWithinLimit(userId, 1, now);
        ensureNotAlreadyBorrowing(userId, bookId);

        if (bookHoldRepository.existsActiveUnexpiredByUserIdAndBookId(
                userId, bookId, HoldStatus.ACTIVE, now)) {
            throw new IllegalArgumentException("You already have an active hold for this book");
        }
    }

    public void ensureCanBorrow(Long userId, long directBorrowCount, LocalDateTime now) {
        ensureWithinLimit(userId, directBorrowCount, now);
    }

    public void ensureNotAlreadyBorrowing(Long userId, Long bookId) {
        if (borrowRecordRepository.existsBySlipUserIdAndBookIdAndStatusIn(
                userId, bookId, ACTIVE_BORROW_STATUSES)) {
            throw new IllegalArgumentException("You are already borrowing this book");
        }
    }

    private void ensureWithinLimit(Long userId, long additionalCommitments, LocalDateTime now) {
        int activeBorrows = borrowRecordRepository.countBySlipUserIdAndStatusIn(
                userId, ACTIVE_BORROW_STATUSES);
        long activeHolds = bookHoldRepository.countActiveUnexpiredByUserId(
                userId, HoldStatus.ACTIVE, now);

        if (activeBorrows + activeHolds + additionalCommitments > maxBooksPerUser) {
            throw new BorrowLimitExceededException(maxBooksPerUser);
        }
    }
}
