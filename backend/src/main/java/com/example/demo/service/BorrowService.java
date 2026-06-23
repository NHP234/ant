package com.example.demo.service;

import com.example.demo.audit.Auditable;
import com.example.demo.dto.request.BorrowItemRequest;
import com.example.demo.dto.request.BorrowRequest;
import com.example.demo.dto.request.BorrowSlipCreateRequest;
import com.example.demo.dto.request.HoldConfirmRequest;
import com.example.demo.dto.request.HoldPickupRequest;
import com.example.demo.dto.response.BorrowRecordResponse;
import com.example.demo.dto.response.BorrowSlipResponse;
import com.example.demo.dto.response.HoldResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.exception.HoldExpiredException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.BookHoldMapper;
import com.example.demo.mapper.BorrowRecordMapper;
import com.example.demo.mapper.BorrowSlipMapper;
import com.example.demo.model.entity.BookCopy;
import com.example.demo.model.entity.BorrowRecord;
import com.example.demo.model.entity.BorrowSlip;
import com.example.demo.model.entity.User;
import com.example.demo.model.enums.BorrowStatus;
import com.example.demo.model.enums.CopyStatus;
import com.example.demo.model.enums.NotificationType;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.BorrowRecordRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BorrowService {

    private final BorrowRecordRepository borrowRecordRepository;
    private final BookCopyRepository bookCopyRepository;
    private final UserRepository userRepository;
    private final BorrowSlipCreationService borrowSlipCreationService;
    private final NotificationService notificationService;
    private final BorrowRecordMapper borrowRecordMapper;
    private final BorrowSlipMapper borrowSlipMapper;
    private final BookHoldMapper bookHoldMapper;
    private final Clock clock;

    @Transactional
    @Auditable(action = "BORROW", entityType = "BORROW_RECORD")
    public BorrowRecordResponse borrowBook(String librarianUsername, BorrowRequest request) {
        BorrowSlip slip = borrowSlipCreationService.createBorrowSlip(
                librarianUsername,
                toSlipRequest(request));
        return borrowRecordMapper.toResponse(slip.getRecords().getFirst());
    }

    @Transactional
    @Auditable(action = "BORROW", entityType = "BORROW_SLIP")
    public BorrowSlipResponse createBorrowSlip(
            String librarianUsername,
            BorrowSlipCreateRequest request) {
        BorrowSlip slip = borrowSlipCreationService.createBorrowSlip(
                librarianUsername,
                request);
        return borrowSlipMapper.toResponse(slip);
    }

    @Transactional(noRollbackFor = HoldExpiredException.class)
    @Auditable(action = "BORROW", entityType = "BORROW_RECORD")
    public HoldResponse confirmHold(
            Long holdId,
            HoldConfirmRequest request,
            String librarianUsername) {
        var hold = borrowSlipCreationService.confirmHold(
                holdId,
                request,
                librarianUsername);
        return bookHoldMapper.toResponse(hold);
    }

    @Transactional
    @Auditable(action = "BORROW", entityType = "BORROW_SLIP")
    public BorrowSlipResponse pickupActiveHolds(
            String librarianUsername,
            HoldPickupRequest request) {
        BorrowSlip slip = borrowSlipCreationService.pickupActiveHolds(
                librarianUsername,
                request);
        return borrowSlipMapper.toResponse(slip);
    }

    @Transactional
    @Auditable(action = "RETURN", entityType = "BORROW_RECORD")
    public BorrowRecordResponse returnBook(Long borrowId, String note) {
        BorrowRecord record = borrowRecordRepository.findByIdForUpdate(borrowId)
                .orElseThrow(() -> new ResourceNotFoundException("BorrowRecord", "id", borrowId));
        if (record.getStatus() == BorrowStatus.RETURNED) {
            throw new IllegalArgumentException("This book has already been returned");
        }

        record.setReturnDate(LocalDateTime.now(clock));
        record.setStatus(BorrowStatus.RETURNED);
        if (note != null) {
            record.setNote(note);
        }

        BookCopy copy = record.getCopy();
        copy.setStatus(CopyStatus.AVAILABLE);
        bookCopyRepository.save(copy);
        record = borrowRecordRepository.save(record);

        notificationService.createNotification(
                record.getSlip().getUser(),
                NotificationType.RETURN_CONFIRM,
                "Trả sách thành công",
                String.format("Bạn đã trả \"%s\".", copy.getBook().getTitle()));
        return borrowRecordMapper.toResponse(record);
    }

    @Transactional(readOnly = true)
    public PageResponse<BorrowRecordResponse> getMyBorrows(
            String username,
            Pageable pageable) {
        return getMyBorrows(username, List.of(), pageable);
    }

    @Transactional(readOnly = true)
    public PageResponse<BorrowRecordResponse> getMyBorrows(
            String username,
            List<BorrowStatus> statuses,
            Pageable pageable) {
        User user = findUserOrThrow(username);
        Page<BorrowRecord> page = (statuses == null || statuses.isEmpty())
                ? borrowRecordRepository.findBySlipUserId(user.getId(), pageable)
                : borrowRecordRepository.findBySlipUserIdAndStatusIn(
                        user.getId(), statuses, pageable);
        List<BorrowRecordResponse> content = page.getContent().stream()
                .map(borrowRecordMapper::toResponse)
                .toList();
        return PageResponse.from(page, content);
    }

    @Transactional(readOnly = true)
    public PageResponse<BorrowRecordResponse> getAllBorrows(Pageable pageable) {
        Page<BorrowRecord> page = borrowRecordRepository.findAll(pageable);
        List<BorrowRecordResponse> content = page.getContent().stream()
                .map(borrowRecordMapper::toResponse)
                .toList();
        return PageResponse.from(page, content);
    }

    @Transactional(readOnly = true)
    public List<BorrowRecordResponse> getOverdueBorrows() {
        return borrowRecordRepository
                .findByStatusAndSlipDueDateBefore(
                        BorrowStatus.BORROWING,
                        LocalDateTime.now(clock))
                .stream()
                .map(borrowRecordMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BorrowRecordResponse> getActiveBorrowsByStudentId(String studentId) {
        return borrowRecordRepository.findActiveBorrowsByStudentId(studentId)
                .stream()
                .map(borrowRecordMapper::toResponse)
                .toList();
    }

    @Transactional
    public void checkAndMarkOverdue() {
        List<BorrowRecord> overdueRecords =
                borrowRecordRepository.findByStatusAndSlipDueDateBeforeForUpdate(
                        BorrowStatus.BORROWING,
                        LocalDateTime.now(clock));

        for (BorrowRecord record : overdueRecords) {
            record.setStatus(BorrowStatus.OVERDUE);
            borrowRecordRepository.save(record);
            notificationService.createNotification(
                    record.getSlip().getUser(),
                    NotificationType.OVERDUE_WARNING,
                    "Sách quá hạn",
                    String.format(
                            "Sách \"%s\" đã quá hạn trả. Vui lòng trả sớm.",
                            record.getCopy().getBook().getTitle()));
        }
    }

    private User findUserOrThrow(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User", "username", username));
    }

    private BorrowSlipCreateRequest toSlipRequest(BorrowRequest request) {
        BorrowItemRequest item = new BorrowItemRequest();
        item.setBookId(request.getBookId());
        item.setCopyId(request.getCopyId());

        BorrowSlipCreateRequest slipRequest = new BorrowSlipCreateRequest();
        slipRequest.setUsername(request.getUsername());
        slipRequest.setStudentId(request.getStudentId());
        slipRequest.setSource(request.getSource());
        slipRequest.setItems(List.of(item));
        return slipRequest;
    }
}
