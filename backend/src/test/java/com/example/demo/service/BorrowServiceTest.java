package com.example.demo.service;

import com.example.demo.dto.request.BorrowRequest;
import com.example.demo.dto.request.BorrowSlipCreateRequest;
import com.example.demo.dto.request.HoldConfirmRequest;
import com.example.demo.dto.request.HoldPickupRequest;
import com.example.demo.dto.response.BorrowRecordResponse;
import com.example.demo.dto.response.BorrowSlipResponse;
import com.example.demo.dto.response.HoldResponse;
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
import com.example.demo.model.enums.NotificationType;
import com.example.demo.model.enums.Role;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.BorrowRecordRepository;
import com.example.demo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BorrowServiceTest {

    private static final LocalDateTime NOW =
            LocalDateTime.of(2026, 6, 11, 10, 0);
    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-06-11T03:00:00Z"),
            ZoneId.of("Asia/Ho_Chi_Minh"));

    @Mock private BorrowRecordRepository borrowRecordRepository;
    @Mock private BookCopyRepository bookCopyRepository;
    @Mock private UserRepository userRepository;
    @Mock private BorrowSlipCreationService borrowSlipCreationService;
    @Mock private NotificationService notificationService;
    @Mock private BorrowRecordMapper borrowRecordMapper;
    @Mock private BorrowSlipMapper borrowSlipMapper;
    @Mock private BookHoldMapper bookHoldMapper;

    private BorrowService borrowService;
    private User student;
    private BookCopy firstCopy;

    @BeforeEach
    void setUp() {
        borrowService = new BorrowService(
                borrowRecordRepository,
                bookCopyRepository,
                userRepository,
                borrowSlipCreationService,
                notificationService,
                borrowRecordMapper,
                borrowSlipMapper,
                bookHoldMapper,
                CLOCK);

        student = User.builder()
                .id(1L)
                .username("student01")
                .studentId("20260001")
                .fullName("Test Student")
                .role(Role.STUDENT)
                .build();
        Book firstBook = Book.builder().id(1L).title("Clean Code").build();
        firstCopy = BookCopy.builder()
                .id(10L)
                .book(firstBook)
                .copyNumber(1)
                .status(CopyStatus.AVAILABLE)
                .build();
    }

    @Test
    void createBorrowSlipDelegatesWorkflowAndMapsResponse() {
        BorrowSlipCreateRequest request = new BorrowSlipCreateRequest();
        BorrowSlip slip = BorrowSlip.builder().id(100L).build();
        BorrowSlipResponse mapped = BorrowSlipResponse.builder().id(100L).build();
        when(borrowSlipCreationService.createBorrowSlip("librarian01", request))
                .thenReturn(slip);
        when(borrowSlipMapper.toResponse(slip)).thenReturn(mapped);

        BorrowSlipResponse result = borrowService.createBorrowSlip("librarian01", request);

        assertThat(result).isSameAs(mapped);
    }

    @Test
    void confirmHoldDelegatesWorkflowAndMapsResponse() {
        HoldConfirmRequest request = new HoldConfirmRequest();
        BookHold hold = BookHold.builder().id(30L).build();
        HoldResponse mapped = HoldResponse.builder().id(30L).build();
        when(borrowSlipCreationService.confirmHold(30L, request, "librarian01"))
                .thenReturn(hold);
        when(bookHoldMapper.toResponse(hold)).thenReturn(mapped);

        HoldResponse result = borrowService.confirmHold(30L, request, "librarian01");

        assertThat(result).isSameAs(mapped);
    }

    @Test
    void pickupActiveHoldsDelegatesWorkflowAndMapsBorrowSlip() {
        HoldPickupRequest request = new HoldPickupRequest();
        BorrowSlip slip = BorrowSlip.builder().id(300L).build();
        BorrowSlipResponse mapped = BorrowSlipResponse.builder().id(300L).build();
        when(borrowSlipCreationService.pickupActiveHolds("librarian01", request))
                .thenReturn(slip);
        when(borrowSlipMapper.toResponse(slip)).thenReturn(mapped);

        BorrowSlipResponse result =
                borrowService.pickupActiveHolds("librarian01", request);

        assertThat(result).isSameAs(mapped);
    }

    @Test
    void legacyBorrowEndpointAdaptsRequestForCreationWorkflow() {
        BorrowRecord record = BorrowRecord.builder().id(1L).build();
        BorrowSlip slip = BorrowSlip.builder().records(List.of(record)).build();
        when(borrowSlipCreationService.createBorrowSlip(
                eq("librarian01"), any(BorrowSlipCreateRequest.class)))
                .thenReturn(slip);
        when(borrowRecordMapper.toResponse(record))
                .thenReturn(BorrowRecordResponse.builder().id(1L).build());
        BorrowRequest request = new BorrowRequest();
        request.setUsername("student01");
        request.setBookId(1L);

        borrowService.borrowBook("librarian01", request);

        ArgumentCaptor<BorrowSlipCreateRequest> requestCaptor =
                ArgumentCaptor.forClass(BorrowSlipCreateRequest.class);
        verify(borrowSlipCreationService).createBorrowSlip(
                eq("librarian01"),
                requestCaptor.capture());
        assertThat(requestCaptor.getValue().getSource()).isNull();
        assertThat(requestCaptor.getValue().getItems()).hasSize(1);
        assertThat(requestCaptor.getValue().getItems().getFirst().getBookId()).isEqualTo(1L);
    }

    @Test
    void returnLocksRecordBeforeChangingState() {
        BorrowRecord record = borrowingRecord();
        when(borrowRecordRepository.findByIdForUpdate(50L))
                .thenReturn(Optional.of(record));
        when(borrowRecordRepository.save(record)).thenReturn(record);
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
}
