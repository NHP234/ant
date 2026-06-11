package com.example.demo.service;

import com.example.demo.exception.BorrowLimitExceededException;
import com.example.demo.model.enums.BorrowStatus;
import com.example.demo.model.enums.HoldStatus;
import com.example.demo.repository.BookHoldRepository;
import com.example.demo.repository.BorrowRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BorrowPolicyServiceTest {

    private static final LocalDateTime NOW =
            LocalDateTime.of(2026, 6, 11, 10, 0);
    private static final List<BorrowStatus> ACTIVE_BORROWS =
            List.of(BorrowStatus.BORROWING, BorrowStatus.OVERDUE);

    @Mock private BorrowRecordRepository borrowRecordRepository;
    @Mock private BookHoldRepository bookHoldRepository;

    private BorrowPolicyService borrowPolicyService;

    @BeforeEach
    void setUp() {
        borrowPolicyService =
                new BorrowPolicyService(borrowRecordRepository, bookHoldRepository);
        ReflectionTestUtils.setField(borrowPolicyService, "maxBooksPerUser", 5);
    }

    @Test
    void createHoldAllowsTheFifthCommitment() {
        when(borrowRecordRepository.countBySlipUserIdAndStatusIn(1L, ACTIVE_BORROWS))
                .thenReturn(2);
        when(bookHoldRepository.countActiveUnexpiredByUserId(
                1L, HoldStatus.ACTIVE, NOW)).thenReturn(2L);

        borrowPolicyService.ensureCanCreateHold(1L, 10L, NOW);

        verify(bookHoldRepository).existsActiveUnexpiredByUserIdAndBookId(
                1L, 10L, HoldStatus.ACTIVE, NOW);
    }

    @Test
    void createHoldRejectsWhenLimitIsAlreadyFull() {
        when(borrowRecordRepository.countBySlipUserIdAndStatusIn(1L, ACTIVE_BORROWS))
                .thenReturn(3);
        when(bookHoldRepository.countActiveUnexpiredByUserId(
                1L, HoldStatus.ACTIVE, NOW)).thenReturn(2L);

        assertThatThrownBy(() ->
                borrowPolicyService.ensureCanCreateHold(1L, 10L, NOW))
                .isInstanceOf(BorrowLimitExceededException.class);
    }

    @Test
    void expiredActiveRowsAreExcludedByTheTimeAwareCount() {
        when(borrowRecordRepository.countBySlipUserIdAndStatusIn(1L, ACTIVE_BORROWS))
                .thenReturn(4);
        when(bookHoldRepository.countActiveUnexpiredByUserId(
                1L, HoldStatus.ACTIVE, NOW)).thenReturn(0L);

        borrowPolicyService.ensureCanCreateHold(1L, 10L, NOW);

        verify(bookHoldRepository).countActiveUnexpiredByUserId(
                1L, HoldStatus.ACTIVE, NOW);
    }

    @Test
    void mixedBatchOnlyAddsDirectBorrowsToExistingCommitments() {
        when(borrowRecordRepository.countBySlipUserIdAndStatusIn(1L, ACTIVE_BORROWS))
                .thenReturn(2);
        when(bookHoldRepository.countActiveUnexpiredByUserId(
                1L, HoldStatus.ACTIVE, NOW)).thenReturn(2L);

        borrowPolicyService.ensureCanBorrow(1L, 1L, NOW);

        verify(bookHoldRepository).countActiveUnexpiredByUserId(
                1L, HoldStatus.ACTIVE, NOW);
    }

    @Test
    void duplicateActiveHoldIsRejected() {
        when(bookHoldRepository.existsActiveUnexpiredByUserIdAndBookId(
                1L, 10L, HoldStatus.ACTIVE, NOW)).thenReturn(true);

        assertThatThrownBy(() ->
                borrowPolicyService.ensureCanCreateHold(1L, 10L, NOW))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("active hold");
    }

    @Test
    void duplicateActiveBorrowIsRejected() {
        when(borrowRecordRepository.existsBySlipUserIdAndBookIdAndStatusIn(
                1L, 10L, ACTIVE_BORROWS)).thenReturn(true);

        assertThatThrownBy(() ->
                borrowPolicyService.ensureNotAlreadyBorrowing(1L, 10L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already borrowing");
    }
}
