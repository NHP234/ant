package com.example.demo.service;

import com.example.demo.dto.request.BorrowRequest;
import com.example.demo.dto.response.BorrowRecordResponse;
import com.example.demo.exception.BookNotAvailableException;
import com.example.demo.exception.BorrowLimitExceededException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.BorrowRecordMapper;
import com.example.demo.model.entity.Book;
import com.example.demo.model.entity.BookCopy;
import com.example.demo.model.entity.BorrowRecord;
import com.example.demo.model.entity.BorrowSlip;
import com.example.demo.model.entity.User;
import com.example.demo.model.enums.BorrowStatus;
import com.example.demo.model.enums.CopyStatus;
import com.example.demo.model.enums.HoldStatus;
import com.example.demo.model.enums.Role;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.BookHoldRepository;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.BorrowRecordRepository;
import com.example.demo.repository.BorrowSlipRepository;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BorrowServiceTest {

    @Mock private BorrowRecordRepository borrowRecordRepository;
    @Mock private BorrowSlipRepository borrowSlipRepository;
    @Mock private BookRepository bookRepository;
    @Mock private BookCopyRepository bookCopyRepository;
    @Mock private BookHoldRepository bookHoldRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private BorrowRecordMapper borrowRecordMapper;

    @InjectMocks private BorrowService borrowService;

    private User testUser;
    private Book testBook;
    private BookCopy testCopy;
    private BorrowRequest borrowRequest;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(borrowService, "maxBooksPerUser", 5);
        ReflectionTestUtils.setField(borrowService, "defaultDueDays", 14);

        testUser = User.builder().id(1L).username("student01").fullName("Test Student").role(Role.STUDENT).build();
        testBook = Book.builder().id(1L).title("Clean Code").author("Robert Martin").build();
        testCopy = BookCopy.builder().id(10L).book(testBook).copyNumber(1).status(CopyStatus.AVAILABLE).build();

        borrowRequest = new BorrowRequest();
        borrowRequest.setBookId(1L);
    }

    @Nested
    @DisplayName("borrowBook")
    class BorrowBook {

        @Test
        @DisplayName("should borrow book successfully")
        void borrowBook_success() {
            when(userRepository.findByUsername("student01")).thenReturn(Optional.of(testUser));
            when(bookRepository.findById(1L)).thenReturn(Optional.of(testBook));
                when(borrowRecordRepository.countBySlipUserIdAndStatusIn(1L, List.of(BorrowStatus.BORROWING, BorrowStatus.OVERDUE)))
                    .thenReturn(0);
                    when(bookHoldRepository.countByUserIdAndStatusIn(1L, List.of(HoldStatus.ACTIVE)))
                    .thenReturn(0L);
                when(borrowRecordRepository.existsBySlipUserIdAndBookIdAndStatusIn(1L, 1L, List.of(BorrowStatus.BORROWING, BorrowStatus.OVERDUE)))
                    .thenReturn(false);
                    when(bookHoldRepository.existsByUserIdAndBookIdAndStatusIn(1L, 1L, List.of(HoldStatus.ACTIVE)))
                    .thenReturn(false);
            when(bookCopyRepository.findAvailableCopiesForUpdate(1L)).thenReturn(List.of(testCopy));
            when(bookCopyRepository.save(any(BookCopy.class))).thenReturn(testCopy);
            when(borrowSlipRepository.save(any(BorrowSlip.class))).thenAnswer(inv -> {
                BorrowSlip slip = inv.getArgument(0);
                slip.setId(1L);
                return slip;
            });
            when(borrowRecordRepository.save(any(BorrowRecord.class))).thenAnswer(inv -> {
                BorrowRecord r = inv.getArgument(0);
                r.setId(1L);
                return r;
            });
            when(borrowRecordMapper.toResponse(any())).thenReturn(
                    BorrowRecordResponse.builder().id(1L).status("BORROWING").bookTitle("Clean Code").build());

            BorrowRecordResponse result = borrowService.borrowBook("student01", borrowRequest);

            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getStatus()).isEqualTo("BORROWING");
            verify(bookCopyRepository).save(any(BookCopy.class));
            verify(notificationRepository).save(any());
        }

        @Test
        @DisplayName("should throw when user not found")
        void borrowBook_userNotFound() {
            when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> borrowService.borrowBook("unknown", borrowRequest))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("should throw when book not found")
        void borrowBook_bookNotFound() {
            when(userRepository.findByUsername("student01")).thenReturn(Optional.of(testUser));
            when(bookRepository.findById(1L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> borrowService.borrowBook("student01", borrowRequest))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("should throw when borrow limit exceeded")
        void borrowBook_limitExceeded() {
            when(userRepository.findByUsername("student01")).thenReturn(Optional.of(testUser));
            when(bookRepository.findById(1L)).thenReturn(Optional.of(testBook));
                when(borrowRecordRepository.countBySlipUserIdAndStatusIn(1L, List.of(BorrowStatus.BORROWING, BorrowStatus.OVERDUE)))
                    .thenReturn(5);
                    when(bookHoldRepository.countByUserIdAndStatusIn(1L, List.of(HoldStatus.ACTIVE)))
                    .thenReturn(0L);

            assertThatThrownBy(() -> borrowService.borrowBook("student01", borrowRequest))
                    .isInstanceOf(BorrowLimitExceededException.class);
        }

        @Test
        @DisplayName("should throw when already borrowing same book")
        void borrowBook_alreadyBorrowing() {
            when(userRepository.findByUsername("student01")).thenReturn(Optional.of(testUser));
            when(bookRepository.findById(1L)).thenReturn(Optional.of(testBook));
                when(borrowRecordRepository.countBySlipUserIdAndStatusIn(1L, List.of(BorrowStatus.BORROWING, BorrowStatus.OVERDUE)))
                    .thenReturn(1);
                    when(bookHoldRepository.countByUserIdAndStatusIn(1L, List.of(HoldStatus.ACTIVE)))
                    .thenReturn(0L);
                when(borrowRecordRepository.existsBySlipUserIdAndBookIdAndStatusIn(1L, 1L, List.of(BorrowStatus.BORROWING, BorrowStatus.OVERDUE)))
                    .thenReturn(true);

            assertThatThrownBy(() -> borrowService.borrowBook("student01", borrowRequest))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already borrowing");
        }

        @Test
        @DisplayName("should throw when book not available")
        void borrowBook_notAvailable() {
            when(userRepository.findByUsername("student01")).thenReturn(Optional.of(testUser));
            when(bookRepository.findById(1L)).thenReturn(Optional.of(testBook));
                when(borrowRecordRepository.countBySlipUserIdAndStatusIn(1L, List.of(BorrowStatus.BORROWING, BorrowStatus.OVERDUE)))
                    .thenReturn(0);
                    when(bookHoldRepository.countByUserIdAndStatusIn(1L, List.of(HoldStatus.ACTIVE)))
                    .thenReturn(0L);
                when(borrowRecordRepository.existsBySlipUserIdAndBookIdAndStatusIn(1L, 1L, List.of(BorrowStatus.BORROWING, BorrowStatus.OVERDUE)))
                    .thenReturn(false);
                    when(bookHoldRepository.existsByUserIdAndBookIdAndStatusIn(1L, 1L, List.of(HoldStatus.ACTIVE)))
                    .thenReturn(false);
            when(bookCopyRepository.findAvailableCopiesForUpdate(1L)).thenReturn(List.of());

            assertThatThrownBy(() -> borrowService.borrowBook("student01", borrowRequest))
                    .isInstanceOf(BookNotAvailableException.class);
        }
    }

    @Nested
    @DisplayName("returnBook")
    class ReturnBook {

        @Test
        @DisplayName("should return book successfully")
        void returnBook_success() {
            BorrowSlip slip = BorrowSlip.builder()
                .id(1L)
                .user(testUser)
                .borrowDate(LocalDateTime.now().minusDays(7))
                .dueDate(LocalDateTime.now().plusDays(7))
                .build();
            BookCopy copy = BookCopy.builder()
                .id(10L)
                .book(testBook)
                .copyNumber(1)
                .status(CopyStatus.BORROWED)
                .build();
            BorrowRecord record = BorrowRecord.builder()
                .id(1L)
                .slip(slip)
                .copy(copy)
                .status(BorrowStatus.BORROWING)
                .build();

            when(borrowRecordRepository.findById(1L)).thenReturn(Optional.of(record));
            when(borrowRecordRepository.save(any())).thenReturn(record);
            when(borrowRecordMapper.toResponse(any())).thenReturn(
                    BorrowRecordResponse.builder().id(1L).status("RETURNED").build());

            BorrowRecordResponse result = borrowService.returnBook(1L, "Good condition");

            assertThat(result.getStatus()).isEqualTo("RETURNED");
            verify(bookCopyRepository).save(copy);
            verify(notificationRepository).save(any());
        }

        @Test
        @DisplayName("should throw when record not found")
        void returnBook_notFound() {
            when(borrowRecordRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> borrowService.returnBook(99L, null))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("should throw when already returned")
        void returnBook_alreadyReturned() {
            BorrowSlip slip = BorrowSlip.builder().id(1L).user(testUser).build();
            BookCopy copy = BookCopy.builder().id(10L).book(testBook).copyNumber(1).build();
            BorrowRecord record = BorrowRecord.builder()
                .id(1L)
                .slip(slip)
                .copy(copy)
                .status(BorrowStatus.RETURNED)
                .build();

            when(borrowRecordRepository.findById(1L)).thenReturn(Optional.of(record));

            assertThatThrownBy(() -> borrowService.returnBook(1L, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already been returned");
        }
    }

    @Nested
    @DisplayName("checkAndMarkOverdue")
    class CheckOverdue {

        @Test
        @DisplayName("should mark overdue records and send notifications")
        void checkAndMarkOverdue_success() {
            BorrowSlip slip = BorrowSlip.builder()
                .id(1L)
                .user(testUser)
                .borrowDate(LocalDateTime.now().minusDays(10))
                .dueDate(LocalDateTime.now().minusDays(1))
                .build();
            BookCopy copy = BookCopy.builder()
                .id(10L)
                .book(testBook)
                .copyNumber(1)
                .status(CopyStatus.BORROWED)
                .build();
            BorrowRecord record = BorrowRecord.builder()
                .id(1L)
                .slip(slip)
                .copy(copy)
                .status(BorrowStatus.BORROWING)
                .build();

            when(borrowRecordRepository.findByStatusAndSlipDueDateBefore(eq(BorrowStatus.BORROWING), any()))
                    .thenReturn(List.of(record));

            borrowService.checkAndMarkOverdue();

            assertThat(record.getStatus()).isEqualTo(BorrowStatus.OVERDUE);
            verify(borrowRecordRepository).save(record);
            verify(notificationRepository).save(any());
        }

        @Test
        @DisplayName("should do nothing when no overdue records")
        void checkAndMarkOverdue_noRecords() {
            when(borrowRecordRepository.findByStatusAndSlipDueDateBefore(eq(BorrowStatus.BORROWING), any()))
                    .thenReturn(List.of());

            borrowService.checkAndMarkOverdue();

            verify(borrowRecordRepository, never()).save(any());
            verify(notificationRepository, never()).save(any());
        }
    }
}
