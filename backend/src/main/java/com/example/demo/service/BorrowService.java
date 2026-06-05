package com.example.demo.service;

import com.example.demo.audit.Auditable;
import com.example.demo.dto.request.BorrowRequest;
import com.example.demo.dto.response.BorrowRecordResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.exception.BookNotAvailableException;
import com.example.demo.exception.BorrowLimitExceededException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.BorrowRecordMapper;
import com.example.demo.model.entity.*;
import com.example.demo.model.enums.BorrowSource;
import com.example.demo.model.enums.BorrowStatus;
import com.example.demo.model.enums.CopyStatus;
import com.example.demo.model.enums.HoldStatus;
import com.example.demo.model.enums.NotificationType;
import com.example.demo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BorrowService {

    private final BorrowRecordRepository borrowRecordRepository;
    private final BorrowSlipRepository borrowSlipRepository;
    private final BookHoldRepository bookHoldRepository;
    private final BookRepository bookRepository;
    private final BookCopyRepository bookCopyRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final BorrowRecordMapper borrowRecordMapper;

    @Value("${app.borrow.max-books-per-user}")
    private int maxBooksPerUser;

    @Value("${app.borrow.default-due-days}")
    private int defaultDueDays;

    @Value("${app.hold.ban-days:7}")
    private int holdBanDays;

    @Transactional
    @Auditable(action = "BORROW", entityType = "BORROW_RECORD")
    public BorrowRecordResponse borrowBook(String librarianUsername, BorrowRequest request) {
        User librarian = userRepository.findByUsername(librarianUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", librarianUsername));
        User borrower = resolveBorrower(request);

        Book book = bookRepository.findById(request.getBookId())
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", request.getBookId()));

        ensureBorrowAllowed(borrower.getId(), book.getId());

        LocalDateTime now = LocalDateTime.now();
        BookHold activeHold = findValidActiveHold(borrower.getId(), book.getId(), now);
        if (activeHold != null) {
            return fulfillHold(activeHold, librarian, request.getCopyId(), resolveBorrowSource(request), now);
        }

        BookCopy copy = resolveCopyForBorrow(book, request.getCopyId());
        BorrowRecord record = createBorrowRecord(borrower, librarian, copy, now, resolveBorrowSource(request));

        sendNotification(borrower, "Mượn sách thành công",
                String.format("Bạn đã mượn \"%s\" (bản #%d). Hạn trả: %s",
                        book.getTitle(), copy.getCopyNumber(), record.getSlip().getDueDate().toLocalDate()),
                NotificationType.BORROW_CONFIRM);

        return borrowRecordMapper.toResponse(record);
    }

    @Transactional
    @Auditable(action = "RETURN", entityType = "BORROW_RECORD")
    public BorrowRecordResponse returnBook(Long borrowId, String note) {
        BorrowRecord record = borrowRecordRepository.findById(borrowId)
                .orElseThrow(() -> new ResourceNotFoundException("BorrowRecord", "id", borrowId));

        if (record.getStatus() == BorrowStatus.RETURNED) {
            throw new IllegalArgumentException("This book has already been returned");
        }

        record.setReturnDate(LocalDateTime.now());
        record.setStatus(BorrowStatus.RETURNED);
        if (note != null) {
            record.setNote(note);
        }

        // Set copy back to AVAILABLE
        BookCopy copy = record.getCopy();
        copy.setStatus(CopyStatus.AVAILABLE);
        bookCopyRepository.save(copy);

        record = borrowRecordRepository.save(record);

        sendNotification(record.getSlip().getUser(), "Trả sách thành công",
                String.format("Bạn đã trả \"%s\".", record.getCopy().getBook().getTitle()),
                NotificationType.RETURN_CONFIRM);

        return borrowRecordMapper.toResponse(record);
    }

    public PageResponse<BorrowRecordResponse> getMyBorrows(String username, Pageable pageable) {
        return getMyBorrows(username, List.of(), pageable);
    }

    public PageResponse<BorrowRecordResponse> getMyBorrows(String username, List<BorrowStatus> statuses, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        Page<BorrowRecord> page = (statuses == null || statuses.isEmpty())
                ? borrowRecordRepository.findBySlipUserId(user.getId(), pageable)
                : borrowRecordRepository.findBySlipUserIdAndStatusIn(user.getId(), statuses, pageable);
        List<BorrowRecordResponse> content = page.getContent().stream()
                .map(borrowRecordMapper::toResponse)
                .toList();
        return PageResponse.from(page, content);
    }

    public PageResponse<BorrowRecordResponse> getAllBorrows(Pageable pageable) {
        Page<BorrowRecord> page = borrowRecordRepository.findAll(pageable);
        List<BorrowRecordResponse> content = page.getContent().stream()
                .map(borrowRecordMapper::toResponse)
                .toList();
        return PageResponse.from(page, content);
    }

    public List<BorrowRecordResponse> getOverdueBorrows() {
        List<BorrowRecord> records = borrowRecordRepository
                .findByStatusAndSlipDueDateBefore(BorrowStatus.BORROWING, LocalDateTime.now());
        return records.stream()
                .map(borrowRecordMapper::toResponse)
                .toList();
    }

    public List<BorrowRecordResponse> getActiveBorrowsByStudentId(String studentId) {
        List<BorrowRecord> records = borrowRecordRepository.findActiveBorrowsByStudentId(studentId);
        return records.stream()
                .map(borrowRecordMapper::toResponse)
                .toList();
    }

    @Transactional
    public void checkAndMarkOverdue() {
        List<BorrowRecord> overdueRecords = borrowRecordRepository
                .findByStatusAndSlipDueDateBefore(BorrowStatus.BORROWING, LocalDateTime.now());

        for (BorrowRecord record : overdueRecords) {
            record.setStatus(BorrowStatus.OVERDUE);
            borrowRecordRepository.save(record);

            sendNotification(record.getSlip().getUser(), "Sách quá hạn",
                    String.format("Sách \"%s\" đã quá hạn trả. Vui lòng trả sớm.",
                            record.getCopy().getBook().getTitle()),
                    NotificationType.OVERDUE_WARNING);
        }
    }

    private BorrowRecordResponse fulfillHold(BookHold hold, User librarian, Long copyId, BorrowSource source, LocalDateTime now) {
        if (hold.getStatus() != HoldStatus.ACTIVE) {
            throw new IllegalArgumentException("Hold is not active");
        }

        BookCopy borrowCopy = resolveCopyForHold(hold, copyId);
        BorrowRecord record = createBorrowRecord(hold.getUser(), librarian, borrowCopy, now, source);

        hold.setStatus(HoldStatus.FULFILLED);
        hold.setFulfilledAt(now);
        hold.setLibrarian(librarian);
        bookHoldRepository.save(hold);

        sendNotification(hold.getUser(),
                "Mượn sách thành công",
                String.format("Bạn đã mượn \"%s\" từ đặt mượn.", borrowCopy.getBook().getTitle()),
                NotificationType.HOLD_FULFILLED);

        return borrowRecordMapper.toResponse(record);
    }

    private void expireHold(BookHold hold, LocalDateTime now) {
        hold.setStatus(HoldStatus.EXPIRED);
        hold.setCanceledAt(now);
        hold.setCancelReason("EXPIRED_NO_PICKUP");
        bookHoldRepository.save(hold);

        BookCopy copy = hold.getCopy();
        if (copy.getStatus() == CopyStatus.RESERVED) {
            copy.setStatus(CopyStatus.AVAILABLE);
            bookCopyRepository.save(copy);
        }

        User user = hold.getUser();
        LocalDateTime banUntil = now.plusDays(holdBanDays);
        if (user.getHoldBanUntil() == null || user.getHoldBanUntil().isBefore(banUntil)) {
            user.setHoldBanUntil(banUntil);
            userRepository.save(user);
        }

        sendNotification(user,
                "Đặt mượn đã hết hạn",
                String.format("Đặt mượn \"%s\" đã hết hạn. Bạn bị tạm khóa đặt mượn đến %s.",
                        copy.getBook().getTitle(), banUntil),
                NotificationType.HOLD_EXPIRED);
        sendNotification(user,
                "Tạm khóa đặt mượn",
                String.format("Bạn không thể đặt mượn trong %d ngày.", holdBanDays),
                NotificationType.HOLD_BAN);
    }

    private void ensureBorrowAllowed(Long userId, Long bookId) {
        int activeBorrows = borrowRecordRepository.countBySlipUserIdAndStatusIn(
                userId, List.of(BorrowStatus.BORROWING, BorrowStatus.OVERDUE));
        long activeHolds = bookHoldRepository.countByUserIdAndStatusIn(
                userId, List.of(HoldStatus.ACTIVE));
        if (activeBorrows + activeHolds >= maxBooksPerUser) {
            throw new BorrowLimitExceededException(maxBooksPerUser);
        }

        if (borrowRecordRepository.existsBySlipUserIdAndBookIdAndStatusIn(
                userId, bookId, List.of(BorrowStatus.BORROWING, BorrowStatus.OVERDUE))) {
            throw new IllegalArgumentException("You are already borrowing this book");
        }
    }

    private BookHold findValidActiveHold(Long userId, Long bookId, LocalDateTime now) {
        BookHold activeHold = bookHoldRepository
                .findFirstByUserIdAndCopyBookIdAndStatusOrderByCreatedAtDesc(userId, bookId, HoldStatus.ACTIVE)
                .orElse(null);
        if (activeHold == null) {
            return null;
        }
        if (activeHold.getExpiresAt().isBefore(now)) {
            expireHold(activeHold, now);
            return null;
        }
        return activeHold;
    }

    private BorrowRecord createBorrowRecord(User borrower, User librarian, BookCopy copy, LocalDateTime now, BorrowSource source) {
        copy.setStatus(CopyStatus.BORROWED);
        bookCopyRepository.save(copy);

        BorrowSlip slip = BorrowSlip.builder()
                .user(borrower)
                .librarian(librarian)
                .borrowDate(now)
                .dueDate(now.plusDays(defaultDueDays))
                .source(source)
                .build();
        slip = borrowSlipRepository.save(slip);

        BorrowRecord record = BorrowRecord.builder()
                .copy(copy)
                .slip(slip)
                .status(BorrowStatus.BORROWING)
                .build();
        return borrowRecordRepository.save(record);
    }

    private BookCopy resolveCopyForHold(BookHold hold, Long copyId) {
        BookCopy reservedCopy = hold.getCopy();
        if (reservedCopy.getStatus() != CopyStatus.RESERVED) {
            throw new IllegalStateException("Reserved copy is not in RESERVED status");
        }

        if (copyId == null || copyId.equals(reservedCopy.getId())) {
            return reservedCopy;
        }

        BookCopy requestedCopy = findAvailableCopyById(copyId, reservedCopy.getBook());
        reservedCopy.setStatus(CopyStatus.AVAILABLE);
        bookCopyRepository.save(reservedCopy);

        hold.setCopy(requestedCopy);
        return requestedCopy;
    }

    private BookCopy resolveCopyForBorrow(Book book, Long copyId) {
        if (copyId != null) {
            return findAvailableCopyById(copyId, book);
        }

        List<BookCopy> availableCopies = bookCopyRepository.findAvailableCopiesForUpdate(book.getId());
        if (availableCopies.isEmpty()) {
            throw new BookNotAvailableException(book.getId());
        }
        return availableCopies.get(0);
    }

    private BookCopy findAvailableCopyById(Long copyId, Book expectedBook) {
        BookCopy requestedCopy = bookCopyRepository.findByIdForUpdate(copyId)
                .orElseThrow(() -> new ResourceNotFoundException("BookCopy", "id", copyId));
        if (!requestedCopy.getBook().getId().equals(expectedBook.getId())) {
            throw new IllegalArgumentException("Requested copy is not the same book");
        }
        if (requestedCopy.getStatus() != CopyStatus.AVAILABLE) {
            throw new IllegalArgumentException("Requested copy is not available");
        }
        return requestedCopy;
    }

    private User resolveBorrower(BorrowRequest request) {
        String username = normalizeIdentifier(request.getUsername());
        String studentId = normalizeIdentifier(request.getStudentId());

        if (username == null && studentId == null) {
            throw new IllegalArgumentException("Borrower identifier is required (username or studentId)");
        }
        if (username != null && studentId != null) {
            throw new IllegalArgumentException("Provide only one of username or studentId");
        }

        if (username != null) {
            return userRepository.findByUsername(username)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
        }

        return userRepository.findByStudentId(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "studentId", studentId));
    }

    private String normalizeIdentifier(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private BorrowSource resolveBorrowSource(BorrowRequest request) {
        return request.getSource() == null ? BorrowSource.COUNTER : request.getSource();
    }

    private void sendNotification(User user, String title, String message, NotificationType type) {
        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .build();
        notificationRepository.save(notification);
    }
}
