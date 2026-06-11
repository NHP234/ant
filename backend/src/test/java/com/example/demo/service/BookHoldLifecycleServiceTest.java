package com.example.demo.service;

import com.example.demo.model.entity.Book;
import com.example.demo.model.entity.BookCopy;
import com.example.demo.model.entity.BookHold;
import com.example.demo.model.entity.User;
import com.example.demo.model.enums.CopyStatus;
import com.example.demo.model.enums.HoldStatus;
import com.example.demo.model.enums.NotificationType;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.BookHoldRepository;
import com.example.demo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookHoldLifecycleServiceTest {

    private static final LocalDateTime NOW =
            LocalDateTime.of(2026, 6, 11, 10, 0);

    @Mock private BookHoldRepository bookHoldRepository;
    @Mock private BookCopyRepository bookCopyRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;

    private BookHoldLifecycleService lifecycleService;
    private User student;
    private User librarian;
    private BookCopy copy;
    private BookHold hold;

    @BeforeEach
    void setUp() {
        lifecycleService = new BookHoldLifecycleService(
                bookHoldRepository,
                bookCopyRepository,
                userRepository,
                notificationService);
        ReflectionTestUtils.setField(lifecycleService, "holdBanDays", 7);

        student = User.builder().id(1L).username("student").build();
        librarian = User.builder().id(2L).username("librarian").build();
        Book book = Book.builder().id(10L).title("Clean Code").build();
        copy = BookCopy.builder()
                .id(20L)
                .book(book)
                .copyNumber(1)
                .status(CopyStatus.RESERVED)
                .build();
        hold = BookHold.builder()
                .id(30L)
                .user(student)
                .copy(copy)
                .status(HoldStatus.ACTIVE)
                .reservedAt(NOW.minusHours(24))
                .expiresAt(NOW)
                .build();
    }

    @Test
    void locksUserBeforeHold() {
        when(bookHoldRepository.findUserIdById(30L)).thenReturn(Optional.of(1L));
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(student));
        when(bookHoldRepository.findByIdAndUserIdForUpdate(30L, 1L))
                .thenReturn(Optional.of(hold));

        assertThat(lifecycleService.lockHoldForUpdate(30L)).isSameAs(hold);

        InOrder order = inOrder(bookHoldRepository, userRepository);
        order.verify(bookHoldRepository).findUserIdById(30L);
        order.verify(userRepository).findByIdForUpdate(1L);
        order.verify(bookHoldRepository).findByIdAndUserIdForUpdate(30L, 1L);
    }

    @Test
    void expiryAtExactBoundaryReleasesCopyAndAppliesBan() {
        when(bookCopyRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(copy));

        boolean expired = lifecycleService.expireIfDue(hold, NOW);

        assertThat(expired).isTrue();
        assertThat(hold.getStatus()).isEqualTo(HoldStatus.EXPIRED);
        assertThat(copy.getStatus()).isEqualTo(CopyStatus.AVAILABLE);
        assertThat(student.getHoldBanUntil()).isEqualTo(NOW.plusDays(7));
        verify(bookHoldRepository).save(hold);
        verify(bookCopyRepository).save(copy);
        verify(userRepository).save(student);
        verify(notificationService, times(2)).createNotification(
                eq(student), any(NotificationType.class), any(), any());
    }

    @Test
    void futureHoldIsNotExpired() {
        hold.setExpiresAt(NOW.plusSeconds(1));

        assertThat(lifecycleService.expireIfDue(hold, NOW)).isFalse();

        verifyNoInteractions(bookCopyRepository, notificationService);
        verify(bookHoldRepository, never()).save(any());
    }

    @Test
    void cancelReleasesReservedCopy() {
        when(bookHoldRepository.save(hold)).thenReturn(hold);
        when(bookCopyRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(copy));

        BookHold result = lifecycleService.cancelHold(
                hold, librarian, "DAMAGED_REQUEST", NOW);

        assertThat(result.getStatus()).isEqualTo(HoldStatus.CANCELED);
        assertThat(result.getLibrarian()).isSameAs(librarian);
        assertThat(copy.getStatus()).isEqualTo(CopyStatus.AVAILABLE);
    }

    @Test
    void fulfillDoesNotReleaseCopy() {
        when(bookHoldRepository.save(hold)).thenReturn(hold);

        lifecycleService.fulfillHold(hold, librarian, NOW);

        assertThat(hold.getStatus()).isEqualTo(HoldStatus.FULFILLED);
        assertThat(hold.getFulfilledAt()).isEqualTo(NOW);
        verifyNoInteractions(bookCopyRepository);
    }

    @Test
    void schedulerSkipsHoldAlreadyProcessedAfterIdQuery() {
        hold.setStatus(HoldStatus.CANCELED);
        when(bookHoldRepository.findUserIdById(30L)).thenReturn(Optional.of(1L));
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(student));
        when(bookHoldRepository.findByIdAndUserIdForUpdate(30L, 1L))
                .thenReturn(Optional.of(hold));

        assertThat(lifecycleService.expireHoldById(30L, NOW)).isFalse();

        verify(bookHoldRepository, never()).save(any());
        verifyNoInteractions(notificationService);
    }
}
