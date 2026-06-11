package com.example.demo.service;

import com.example.demo.dto.request.HoldCancelRequest;
import com.example.demo.dto.request.HoldCreateRequest;
import com.example.demo.dto.response.HoldResponse;
import com.example.demo.exception.HoldExpiredException;
import com.example.demo.mapper.BookHoldMapper;
import com.example.demo.model.entity.Book;
import com.example.demo.model.entity.BookCopy;
import com.example.demo.model.entity.BookHold;
import com.example.demo.model.entity.User;
import com.example.demo.model.enums.CopyStatus;
import com.example.demo.model.enums.HoldStatus;
import com.example.demo.model.enums.NotificationType;
import com.example.demo.model.enums.Role;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.BookHoldRepository;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookHoldServiceTest {

    private static final LocalDateTime NOW =
            LocalDateTime.of(2026, 6, 11, 10, 0);
    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-06-11T03:00:00Z"),
            ZoneId.of("Asia/Ho_Chi_Minh"));

    @Mock private BookHoldRepository bookHoldRepository;
    @Mock private BookRepository bookRepository;
    @Mock private BookCopyRepository bookCopyRepository;
    @Mock private UserRepository userRepository;
    @Mock private BookHoldMapper bookHoldMapper;
    @Mock private BorrowPolicyService borrowPolicyService;
    @Mock private BookHoldLifecycleService lifecycleService;
    @Mock private NotificationService notificationService;

    private BookHoldService bookHoldService;
    private User student;
    private User librarian;
    private Book book;
    private BookCopy copy;
    private BookHold hold;

    @BeforeEach
    void setUp() {
        bookHoldService = new BookHoldService(
                bookHoldRepository,
                bookRepository,
                bookCopyRepository,
                userRepository,
                bookHoldMapper,
                borrowPolicyService,
                lifecycleService,
                notificationService,
                CLOCK);
        ReflectionTestUtils.setField(bookHoldService, "holdExpireHours", 24);

        student = User.builder()
                .id(1L)
                .username("student")
                .role(Role.STUDENT)
                .build();
        librarian = User.builder()
                .id(2L)
                .username("librarian")
                .role(Role.LIBRARIAN)
                .build();
        book = Book.builder().id(10L).title("Clean Code").build();
        copy = BookCopy.builder()
                .id(20L)
                .book(book)
                .copyNumber(1)
                .status(CopyStatus.AVAILABLE)
                .build();
        hold = BookHold.builder()
                .id(30L)
                .user(student)
                .copy(copy)
                .status(HoldStatus.ACTIVE)
                .reservedAt(NOW)
                .expiresAt(NOW.plusHours(24))
                .build();
    }

    @Test
    void createHoldUsesSharedPolicyAndReservesCopy() {
        HoldCreateRequest request = new HoldCreateRequest();
        request.setBookId(10L);
        when(userRepository.findByUsernameForUpdate("student"))
                .thenReturn(Optional.of(student));
        when(bookRepository.findById(10L)).thenReturn(Optional.of(book));
        when(bookCopyRepository.findAvailableCopiesForUpdate(10L))
                .thenReturn(List.of(copy));
        when(bookHoldRepository.save(any(BookHold.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(bookHoldMapper.toResponse(any()))
                .thenReturn(HoldResponse.builder().id(30L).build());

        HoldResponse response = bookHoldService.createHold("student", request);

        assertThat(response.getId()).isEqualTo(30L);
        assertThat(copy.getStatus()).isEqualTo(CopyStatus.RESERVED);
        verify(borrowPolicyService).ensureCanCreateHold(1L, 10L, NOW);
        verify(notificationService).createNotification(
                eq(student),
                eq(NotificationType.HOLD_CREATED),
                any(),
                any());
    }

    @Test
    void bannedUserCannotCreateHold() {
        student.setHoldBanUntil(NOW.plusDays(1));
        HoldCreateRequest request = new HoldCreateRequest();
        request.setBookId(10L);
        when(userRepository.findByUsernameForUpdate("student"))
                .thenReturn(Optional.of(student));

        assertThatThrownBy(() -> bookHoldService.createHold("student", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("temporarily banned");

        verifyNoInteractions(borrowPolicyService, bookRepository);
    }

    @Test
    void createHoldExpiresStaleReservationBeforeSelectingCopy() {
        HoldCreateRequest request = new HoldCreateRequest();
        request.setBookId(10L);
        BookHold staleHold = BookHold.builder()
                .id(29L)
                .user(student)
                .copy(copy)
                .status(HoldStatus.ACTIVE)
                .expiresAt(NOW)
                .build();
        when(userRepository.findByUsernameForUpdate("student"))
                .thenReturn(Optional.of(student));
        when(bookRepository.findById(10L)).thenReturn(Optional.of(book));
        when(lifecycleService.findActiveHoldForBorrow(1L, 10L))
                .thenReturn(staleHold);
        when(bookCopyRepository.findAvailableCopiesForUpdate(10L))
                .thenReturn(List.of(copy));
        when(bookHoldRepository.save(any(BookHold.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(bookHoldMapper.toResponse(any()))
                .thenReturn(HoldResponse.builder().id(30L).build());

        bookHoldService.createHold("student", request);

        verify(lifecycleService).expireIfDue(staleHold, NOW);
    }

    @Test
    void studentCannotCancelAnotherUsersHold() {
        when(lifecycleService.lockHoldForUpdate(30L)).thenReturn(hold);

        assertThatThrownBy(() ->
                bookHoldService.cancelHold(30L, null, "other-student", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not allowed");

        verify(lifecycleService, never()).cancelHold(any(), any(), any(), any());
    }

    @Test
    void staffCancellationDelegatesStateTransitionToLifecycle() {
        HoldCancelRequest request = new HoldCancelRequest();
        request.setReason("REQUESTED_AT_COUNTER");
        when(lifecycleService.lockHoldForUpdate(30L)).thenReturn(hold);
        when(userRepository.findByUsername("librarian"))
                .thenReturn(Optional.of(librarian));
        when(lifecycleService.cancelHold(
                hold, librarian, "REQUESTED_AT_COUNTER", NOW)).thenReturn(hold);
        when(bookHoldMapper.toResponse(hold))
                .thenReturn(HoldResponse.builder().id(30L).status("CANCELED").build());

        HoldResponse response = bookHoldService.cancelHold(
                30L, request, "librarian", true);

        assertThat(response.getStatus()).isEqualTo("CANCELED");
        verify(notificationService).createNotification(
                eq(student),
                eq(NotificationType.HOLD_CANCELED),
                any(),
                any());
    }

    @Test
    void expiredHoldCannotBeCanceledToAvoidNoShowBan() {
        when(lifecycleService.lockHoldForUpdate(30L)).thenReturn(hold);
        when(lifecycleService.expireIfDue(hold, NOW)).thenReturn(true);

        assertThatThrownBy(() ->
                bookHoldService.cancelHold(30L, null, "student", false))
                .isInstanceOf(HoldExpiredException.class);

        verify(lifecycleService, never()).cancelHold(any(), any(), any(), any());
    }

    @Test
    void expiryBatchContinuesWhenOneHoldFails() {
        when(bookHoldRepository.findIdsByStatusAndExpiredAt(HoldStatus.ACTIVE, NOW))
                .thenReturn(List.of(30L, 31L, 32L));
        when(lifecycleService.expireHoldById(30L, NOW)).thenReturn(true);
        when(lifecycleService.expireHoldById(31L, NOW))
                .thenThrow(new IllegalStateException("database conflict"));
        when(lifecycleService.expireHoldById(32L, NOW)).thenReturn(false);

        assertThat(bookHoldService.expireHolds()).isEqualTo(1);

        verify(lifecycleService).expireHoldById(32L, NOW);
    }
}
