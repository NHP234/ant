package com.example.demo.service;

import com.example.demo.dto.request.BorrowItemRequest;
import com.example.demo.dto.request.BorrowSlipCreateRequest;
import com.example.demo.dto.request.HoldConfirmRequest;
import com.example.demo.dto.request.HoldPickupRequest;
import com.example.demo.exception.BookNotAvailableException;
import com.example.demo.exception.HoldExpiredException;
import com.example.demo.model.entity.Book;
import com.example.demo.model.entity.BookCopy;
import com.example.demo.model.entity.BookHold;
import com.example.demo.model.entity.BorrowRecord;
import com.example.demo.model.entity.BorrowSlip;
import com.example.demo.model.entity.User;
import com.example.demo.model.enums.BorrowSource;
import com.example.demo.model.enums.CopyStatus;
import com.example.demo.model.enums.HoldStatus;
import com.example.demo.model.enums.NotificationType;
import com.example.demo.model.enums.Role;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.BookHoldRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class BorrowSlipCreationServiceTest {

    private static final LocalDateTime NOW =
            LocalDateTime.of(2026, 6, 11, 10, 0);
    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-06-11T03:00:00Z"),
            ZoneId.of("Asia/Ho_Chi_Minh"));

    @Mock private BorrowRecordRepository borrowRecordRepository;
    @Mock private BorrowSlipRepository borrowSlipRepository;
    @Mock private BookHoldRepository bookHoldRepository;
    @Mock private BookRepository bookRepository;
    @Mock private BookCopyRepository bookCopyRepository;
    @Mock private UserRepository userRepository;
    @Mock private BorrowPolicyService borrowPolicyService;
    @Mock private BookHoldLifecycleService bookHoldLifecycleService;
    @Mock private NotificationService notificationService;

    private BorrowSlipCreationService creationService;
    private User student;
    private User librarian;
    private Book firstBook;
    private BookCopy firstCopy;

    @BeforeEach
    void setUp() {
        creationService = new BorrowSlipCreationService(
                borrowRecordRepository,
                borrowSlipRepository,
                bookHoldRepository,
                bookRepository,
                bookCopyRepository,
                userRepository,
                borrowPolicyService,
                bookHoldLifecycleService,
                notificationService,
                CLOCK);
        ReflectionTestUtils.setField(creationService, "maxBooksPerUser", 5);
        ReflectionTestUtils.setField(creationService, "defaultDueDays", 14);

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

            BorrowSlip result = creationService.createBorrowSlip(
                    "librarian01",
                    slipRequest(borrowItem(1L, null), borrowItem(2L, null)));

            assertThat(result.getRecords()).hasSize(2);
            ArgumentCaptor<BorrowRecord> records =
                    ArgumentCaptor.forClass(BorrowRecord.class);
            verify(borrowRecordRepository, times(2)).save(records.capture());
            assertThat(records.getAllValues())
                    .extracting(BorrowRecord::getSlip)
                    .containsOnly(result);
            verify(borrowSlipRepository).save(result);
            verify(notificationService, times(2)).createNotification(
                    eq(student),
                    eq(NotificationType.BORROW_CONFIRM),
                    any(),
                    any());
        }

        @Test
        void defaultsMissingSourceToCounter() {
            stubBookWithoutHold(firstBook, firstCopy);
            BorrowSlipCreateRequest request = slipRequest(borrowItem(1L, null));
            request.setSource(null);

            BorrowSlip result =
                    creationService.createBorrowSlip("librarian01", request);

            assertThat(result.getSource()).isEqualTo(BorrowSource.COUNTER);
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

            creationService.createBorrowSlip(
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
                    creationService.createBorrowSlip("librarian01", request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Duplicate book");

            verifyNoInteractions(bookRepository);
        }

        @Test
        void rejectsNonStudentBorrower() {
            User staffBorrower = User.builder()
                    .id(3L)
                    .username("staff-borrower")
                    .role(Role.LIBRARIAN)
                    .build();
            when(userRepository.findByUsernameForUpdate("staff-borrower"))
                    .thenReturn(Optional.of(staffBorrower));
            BorrowSlipCreateRequest request = slipRequest(borrowItem(1L, null));
            request.setUsername("staff-borrower");

            assertThatThrownBy(() ->
                    creationService.createBorrowSlip("librarian01", request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Borrower must be a student");

            verifyNoInteractions(bookRepository);
        }

        @Test
        void unavailableItemDoesNotCreateSlip() {
            Book secondBook = Book.builder().id(2L).title("Unavailable").build();
            stubBookWithoutHold(firstBook, firstCopy);
            when(bookRepository.findById(2L)).thenReturn(Optional.of(secondBook));
            when(bookHoldLifecycleService.findActiveHoldForBorrow(1L, 2L)).thenReturn(null);
            when(bookCopyRepository.findAvailableCopiesForUpdate(2L)).thenReturn(List.of());

            assertThatThrownBy(() -> creationService.createBorrowSlip(
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

            BookHold result =
                    creationService.confirmHold(30L, new HoldConfirmRequest(), "librarian01");

            assertThat(result).isSameAs(hold);
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
                    creationService.confirmHold(30L, null, "librarian01"))
                    .isInstanceOf(HoldExpiredException.class)
                    .hasMessageContaining("30");

            verifyNoInteractions(borrowSlipRepository);
        }
    }

    @Nested
    @DisplayName("pickupActiveHolds")
    class PickupActiveHolds {

        @Test
        void createsOneSlipForAllActiveHoldsOfStudent() {
            firstCopy.setStatus(CopyStatus.RESERVED);
            Book secondBook = Book.builder().id(2L).title("Refactoring").build();
            BookCopy secondCopy = BookCopy.builder()
                    .id(20L)
                    .book(secondBook)
                    .copyNumber(1)
                    .status(CopyStatus.RESERVED)
                    .build();
            BookHold firstHold = activeHold(firstCopy);
            BookHold secondHold = BookHold.builder()
                    .id(31L)
                    .user(student)
                    .copy(secondCopy)
                    .status(HoldStatus.ACTIVE)
                    .reservedAt(NOW.minusHours(1))
                    .expiresAt(NOW.plusHours(1))
                    .build();
            when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(student));
            when(bookHoldRepository.findActiveUnexpiredByUserIdForUpdate(
                    1L, HoldStatus.ACTIVE, NOW))
                    .thenReturn(List.of(firstHold, secondHold));
            when(bookCopyRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(firstCopy));
            when(bookCopyRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(secondCopy));

            HoldPickupRequest request = new HoldPickupRequest();
            request.setUserId(1L);
            BorrowSlip result =
                    creationService.pickupActiveHolds("librarian01", request);

            assertThat(result.getRecords()).hasSize(2);
            assertThat(firstCopy.getStatus()).isEqualTo(CopyStatus.BORROWED);
            assertThat(secondCopy.getStatus()).isEqualTo(CopyStatus.BORROWED);
            verify(borrowSlipRepository).save(result);
            verify(borrowRecordRepository, times(2)).save(any(BorrowRecord.class));
            verify(bookHoldLifecycleService).fulfillHold(firstHold, librarian, NOW);
            verify(bookHoldLifecycleService).fulfillHold(secondHold, librarian, NOW);
            ArgumentCaptor<String> titleCaptor = ArgumentCaptor.forClass(String.class);
            ArgumentCaptor<String> messageCaptor = ArgumentCaptor.forClass(String.class);
            verify(notificationService, times(2)).createNotification(
                    eq(student),
                    eq(NotificationType.HOLD_FULFILLED),
                    titleCaptor.capture(),
                    messageCaptor.capture());
            assertThat(titleCaptor.getAllValues())
                    .containsOnly("Mượn sách thành công");
            assertThat(messageCaptor.getAllValues())
                    .containsExactly(
                            "Bạn đã mượn \"Clean Code\" từ đặt mượn.",
                            "Bạn đã mượn \"Refactoring\" từ đặt mượn.");
        }

        @Test
        void rejectsWhenStudentHasNoActiveHolds() {
            when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(student));
            when(bookHoldRepository.findActiveUnexpiredByUserIdForUpdate(
                    1L, HoldStatus.ACTIVE, NOW))
                    .thenReturn(List.of());

            HoldPickupRequest request = new HoldPickupRequest();
            request.setUserId(1L);

            assertThatThrownBy(() ->
                    creationService.pickupActiveHolds("librarian01", request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("No active holds");

            verify(borrowSlipRepository, never()).save(any());
            verify(borrowRecordRepository, never()).save(any());
        }
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
