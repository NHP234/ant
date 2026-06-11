package com.example.demo.service;

import com.example.demo.dto.request.BorrowItemRequest;
import com.example.demo.dto.request.BorrowRequest;
import com.example.demo.dto.request.BorrowSlipCreateRequest;
import com.example.demo.dto.request.HoldConfirmRequest;
import com.example.demo.dto.response.BorrowRecordResponse;
import com.example.demo.dto.response.BorrowSlipResponse;
import com.example.demo.dto.response.HoldResponse;
import com.example.demo.exception.BookNotAvailableException;
import com.example.demo.exception.HoldExpiredException;
import com.example.demo.mapper.BookHoldMapper;
import com.example.demo.mapper.BorrowRecordMapper;
import com.example.demo.mapper.BorrowSlipMapper;
import com.example.demo.model.entity.Book;
import com.example.demo.model.entity.BookCopy;
import com.example.demo.model.entity.BookHold;
import com.example.demo.model.entity.BorrowRecord;
import com.example.demo.model.entity.BorrowSlip;
import com.example.demo.model.entity.User;
import com.example.demo.model.enums.BorrowSource;
import com.example.demo.model.enums.BorrowStatus;
import com.example.demo.model.enums.CopyStatus;
import com.example.demo.model.enums.HoldStatus;
import com.example.demo.model.enums.NotificationType;
import com.example.demo.model.enums.Role;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.BorrowRecordRepository;
import com.example.demo.repository.BorrowSlipRepository;
import com.example.demo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class BorrowServiceTest {

    private static final LocalDateTime NOW =
            LocalDateTime.of(2026, 6, 11, 10, 0);
    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-06-11T03:00:00Z"),
            ZoneId.of("Asia/Ho_Chi_Minh"));

    @Mock private BorrowRecordRepository borrowRecordRepository;
    @Mock private BorrowSlipRepository borrowSlipRepository;
    @Mock private BookRepository bookRepository;
    @Mock private BookCopyRepository bookCopyRepository;
    @Mock private UserRepository userRepository;
    @Mock private BorrowPolicyService borrowPolicyService;
    @Mock private BookHoldLifecycleService bookHoldLifecycleService;
    @Mock private NotificationService notificationService;
    @Mock private BorrowRecordMapper borrowRecordMapper;
    @Mock private BorrowSlipMapper borrowSlipMapper;
    @Mock private BookHoldMapper bookHoldMapper;

    private BorrowService borrowService;
    private User student;
    private User librarian;
    private Book firstBook;
    private BookCopy firstCopy;

    @BeforeEach
    void setUp() {
        borrowService = new BorrowService(
                borrowRecordRepository,
                borrowSlipRepository,
                bookRepository,
                bookCopyRepository,
                userRepository,
                borrowPolicyService,
                bookHoldLifecycleService,
                notificationService,
                borrowRecordMapper,
                borrowSlipMapper,
                bookHoldMapper,
                CLOCK);
        ReflectionTestUtils.setField(borrowService, "maxBooksPerUser", 5);
        ReflectionTestUtils.setField(borrowService, "defaultDueDays", 14);

        student = User.builder()
                .id(1L)
                .username("student01")
                .studentId("20260001")
                .fullName("Test Student")
                .role(Role.STUDENT)
                .build();
        librarian = User.builder()
                .id(2L)
                .username("librarian01")
                .fullName("Test Librarian")
                .role(Role.LIBRARIAN)
                .build();
        firstBook = Book.builder().id(1L).title("Clean Code").build();
        firstCopy = BookCopy.builder()
                .id(10L)
                .book(firstBook)
                .copyNumber(1)
                .status(CopyStatus.AVAILABLE)
                .build();

        when(userRepository.findByUsername("librarian01")).thenReturn(Optional.of(librarian));
        when(userRepository.findByUsernameForUpdate("student01")).thenReturn(Optional.of(student));
        when(userRepository.findByStudentIdForUpdate("20260001")).thenReturn(Optional.of(student));
        when(borrowSlipRepository.save(any(BorrowSlip.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(borrowRecordRepository.save(any(BorrowRecord.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Nested
    @DisplayName("createBorrowSlip")
    class CreateBorrowSlip {

        @Test
        void createsOneSlipWithMultipleRecords() {
            Book secondBook = Book.builder().id(2L).title("Refactoring").build();
            BookCopy secondCopy = BookCopy.builder()
                    .id(20L)
                    .book(secondBook)
                    .copyNumber(1)
                    .status(CopyStatus.AVAILABLE)
                    .build();
            stubBookWithoutHold(firstBook, firstCopy);
            stubBookWithoutHold(secondBook, secondCopy);
            when(borrowSlipMapper.toResponse(any()))
                    .thenReturn(BorrowSlipResponse.builder().id(100L).build());

            BorrowSlipResponse response = borrowService.createBorrowSlip(
                    "librarian01",
                    slipRequest(borrowItem(1L, null), borrowItem(2L, null)));

            assertThat(response.getId()).isEqualTo(100L);
            ArgumentCaptor<BorrowRecord> records =
                    ArgumentCaptor.forClass(BorrowRecord.class);
            verify(borrowRecordRepository, times(2)).save(records.capture());
            assertThat(records.getAllValues())
                    .extracting(BorrowRecord::getSlip)
                    .containsOnly(records.getAllValues().getFirst().getSlip());
            verify(borrowSlipRepository).save(any(BorrowSlip.class));
            verify(notificationService, times(2)).createNotification(
                    eq(student),
                    eq(NotificationType.BORROW_CONFIRM),
                    any(),
                    any());
        }

        @Test
        void mixedHoldAndDirectBorrowOnlyCountsDirectItem() {
            firstCopy.setStatus(CopyStatus.RESERVED);
            BookHold hold = activeHold(firstCopy);
            Book secondBook = Book.builder().id(2L).title("Refactoring").build();
            BookCopy secondCopy = BookCopy.builder()
                    .id(20L)
                    .book(secondBook)
                    .copyNumber(1)
                    .status(CopyStatus.AVAILABLE)
                    .build();
            when(bookRepository.findById(1L)).thenReturn(Optional.of(firstBook));
            when(bookRepository.findById(2L)).thenReturn(Optional.of(secondBook));
            when(bookHoldLifecycleService.findActiveHoldForBorrow(1L, 1L)).thenReturn(hold);
            when(bookHoldLifecycleService.findActiveHoldForBorrow(1L, 2L)).thenReturn(null);
            when(bookCopyRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(firstCopy));
            when(bookCopyRepository.findAvailableCopiesForUpdate(2L))
                    .thenReturn(List.of(secondCopy));
            when(borrowSlipMapper.toResponse(any()))
                    .thenReturn(BorrowSlipResponse.builder().build());

            borrowService.createBorrowSlip(
                    "librarian01",
                    slipRequest(borrowItem(1L, 10L), borrowItem(2L, null)));

            verify(borrowPolicyService).ensureCanBorrow(1L, 1L, NOW);
            verify(bookHoldLifecycleService).fulfillHold(hold, librarian, NOW);
            verify(borrowRecordRepository, times(2)).save(any(BorrowRecord.class));
        }

        @Test
        void rejectsDuplicateBookBeforeDatabaseAccess() {
            BorrowSlipCreateRequest request =
                    slipRequest(borrowItem(1L, 10L), borrowItem(1L, 11L));

            assertThatThrownBy(() ->
                    borrowService.createBorrowSlip("librarian01", request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Duplicate book");

            verifyNoInteractions(bookRepository);
        }

        @Test
        void unavailableItemDoesNotCreateSlip() {
            Book secondBook = Book.builder().id(2L).title("Unavailable").build();
            stubBookWithoutHold(firstBook, firstCopy);
            when(bookRepository.findById(2L)).thenReturn(Optional.of(secondBook));
            when(bookHoldLifecycleService.findActiveHoldForBorrow(1L, 2L)).thenReturn(null);
            when(bookCopyRepository.findAvailableCopiesForUpdate(2L)).thenReturn(List.of());

            assertThatThrownBy(() -> borrowService.createBorrowSlip(
                    "librarian01",
                    slipRequest(borrowItem(1L, null), borrowItem(2L, null))))
                    .isInstanceOf(BookNotAvailableException.class);

            verify(borrowSlipRepository, never()).save(any());
            verify(borrowRecordRepository, never()).save(any());
            assertThat(firstCopy.getStatus()).isEqualTo(CopyStatus.AVAILABLE);
        }
    }

    @Nested
    @DisplayName("confirmHold")
    class ConfirmHold {

        @Test
        void createsBorrowRecordAndFulfillsHold() {
            firstCopy.setStatus(CopyStatus.RESERVED);
            BookHold hold = activeHold(firstCopy);
            when(bookHoldLifecycleService.lockHoldForUpdate(30L)).thenReturn(hold);
            when(bookCopyRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(firstCopy));
            when(bookHoldMapper.toResponse(hold))
                    .thenReturn(HoldResponse.builder().id(30L).status("FULFILLED").build());

            HoldResponse response =
                    borrowService.confirmHold(30L, new HoldConfirmRequest(), "librarian01");

            assertThat(response.getStatus()).isEqualTo("FULFILLED");
            verify(bookHoldLifecycleService).fulfillHold(hold, librarian, NOW);
            verify(borrowSlipRepository).save(any(BorrowSlip.class));
            verify(borrowRecordRepository).save(any(BorrowRecord.class));
            assertThat(firstCopy.getStatus()).isEqualTo(CopyStatus.BORROWED);
        }

        @Test
        void expiresHoldAndReturnsSpecificError() {
            firstCopy.setStatus(CopyStatus.RESERVED);
            BookHold hold = activeHold(firstCopy);
            hold.setExpiresAt(NOW);
            when(bookHoldLifecycleService.lockHoldForUpdate(30L)).thenReturn(hold);
            when(bookHoldLifecycleService.expireIfDue(hold, NOW)).thenReturn(true);

            assertThatThrownBy(() ->
                    borrowService.confirmHold(30L, null, "librarian01"))
                    .isInstanceOf(HoldExpiredException.class)
                    .hasMessageContaining("30");

            verifyNoInteractions(borrowSlipRepository);
        }
    }

    @Nested
    @DisplayName("return and overdue")
    class ReturnAndOverdue {

        @Test
        void returnLocksRecordBeforeChangingState() {
            BorrowRecord record = borrowingRecord();
            when(borrowRecordRepository.findByIdForUpdate(50L))
                    .thenReturn(Optional.of(record));
            when(borrowRecordMapper.toResponse(record))
                    .thenReturn(BorrowRecordResponse.builder()
                            .id(50L)
                            .status("RETURNED")
                            .build());

            BorrowRecordResponse response = borrowService.returnBook(50L, "Good");

            assertThat(response.getStatus()).isEqualTo("RETURNED");
            assertThat(record.getReturnDate()).isEqualTo(NOW);
            InOrder order = inOrder(borrowRecordRepository, notificationService);
            order.verify(borrowRecordRepository).findByIdForUpdate(50L);
            order.verify(borrowRecordRepository).save(record);
            order.verify(notificationService).createNotification(
                    eq(student),
                    eq(NotificationType.RETURN_CONFIRM),
                    any(),
                    any());
        }

        @Test
        void alreadyReturnedDoesNotSendAnotherNotification() {
            BorrowRecord record = borrowingRecord();
            record.setStatus(BorrowStatus.RETURNED);
            when(borrowRecordRepository.findByIdForUpdate(50L))
                    .thenReturn(Optional.of(record));

            assertThatThrownBy(() -> borrowService.returnBook(50L, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already been returned");

            verifyNoInteractions(notificationService);
        }

        @Test
        void overdueCheckUsesLockedQueryAndNotifiesOnce() {
            BorrowRecord record = borrowingRecord();
            when(borrowRecordRepository.findByStatusAndSlipDueDateBeforeForUpdate(
                    BorrowStatus.BORROWING, NOW)).thenReturn(List.of(record));

            borrowService.checkAndMarkOverdue();

            assertThat(record.getStatus()).isEqualTo(BorrowStatus.OVERDUE);
            verify(borrowRecordRepository).save(record);
            verify(notificationService).createNotification(
                    eq(student),
                    eq(NotificationType.OVERDUE_WARNING),
                    any(),
                    any());
        }

        @Test
        void emptyOverdueCheckDoesNotNotify() {
            when(borrowRecordRepository.findByStatusAndSlipDueDateBeforeForUpdate(
                    BorrowStatus.BORROWING, NOW)).thenReturn(List.of());

            borrowService.checkAndMarkOverdue();

            verifyNoInteractions(notificationService);
        }
    }

    @Test
    void legacyBorrowEndpointStillDefaultsToCounter() {
        stubBookWithoutHold(firstBook, firstCopy);
        when(borrowRecordMapper.toResponse(any()))
                .thenReturn(BorrowRecordResponse.builder().id(1L).build());
        BorrowRequest request = new BorrowRequest();
        request.setUsername("student01");
        request.setBookId(1L);

        borrowService.borrowBook("librarian01", request);

        ArgumentCaptor<BorrowSlip> slip = ArgumentCaptor.forClass(BorrowSlip.class);
        verify(borrowSlipRepository).save(slip.capture());
        assertThat(slip.getValue().getSource()).isEqualTo(BorrowSource.COUNTER);
    }

    private void stubBookWithoutHold(Book book, BookCopy copy) {
        when(bookRepository.findById(book.getId())).thenReturn(Optional.of(book));
        when(bookHoldLifecycleService.findActiveHoldForBorrow(1L, book.getId()))
                .thenReturn(null);
        when(bookCopyRepository.findAvailableCopiesForUpdate(book.getId()))
                .thenReturn(List.of(copy));
    }

    private BookHold activeHold(BookCopy copy) {
        return BookHold.builder()
                .id(30L)
                .user(student)
                .copy(copy)
                .status(HoldStatus.ACTIVE)
                .reservedAt(NOW.minusHours(1))
                .expiresAt(NOW.plusHours(1))
                .build();
    }

    private BorrowRecord borrowingRecord() {
        BorrowSlip slip = BorrowSlip.builder()
                .id(40L)
                .user(student)
                .borrowDate(NOW.minusDays(10))
                .dueDate(NOW.minusDays(1))
                .build();
        firstCopy.setStatus(CopyStatus.BORROWED);
        return BorrowRecord.builder()
                .id(50L)
                .slip(slip)
                .copy(firstCopy)
                .status(BorrowStatus.BORROWING)
                .build();
    }

    private BorrowSlipCreateRequest slipRequest(BorrowItemRequest... items) {
        BorrowSlipCreateRequest request = new BorrowSlipCreateRequest();
        request.setUsername("student01");
        request.setSource(BorrowSource.COUNTER);
        request.setItems(List.of(items));
        return request;
    }

    private BorrowItemRequest borrowItem(Long bookId, Long copyId) {
        BorrowItemRequest item = new BorrowItemRequest();
        item.setBookId(bookId);
        item.setCopyId(copyId);
        return item;
    }
}
