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
    private final BookRepository bookRepository;
    private final BookCopyRepository bookCopyRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final BorrowRecordMapper borrowRecordMapper;

    @Value("${app.borrow.max-books-per-user}")
    private int maxBooksPerUser;

    @Value("${app.borrow.default-due-days}")
    private int defaultDueDays;

    @Transactional
    @Auditable(action = "BORROW", entityType = "BORROW_RECORD")
    public BorrowRecordResponse borrowBook(String username, BorrowRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        Book book = bookRepository.findById(request.getBookId())
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", request.getBookId()));

        // Check borrow limit
        int activeBorrows = borrowRecordRepository.countBySlipUserIdAndStatus(user.getId(), BorrowStatus.BORROWING);
        if (activeBorrows >= maxBooksPerUser) {
            throw new BorrowLimitExceededException(maxBooksPerUser);
        }

        // Check if already borrowing this book
                if (borrowRecordRepository.existsBySlipUserIdAndBookIdAndStatus(user.getId(), book.getId(), BorrowStatus.BORROWING)) {
            throw new IllegalArgumentException("You are already borrowing this book");
        }

        // Find an available copy (with pessimistic lock to prevent race conditions)
        List<BookCopy> availableCopies = bookCopyRepository.findAvailableCopiesForUpdate(book.getId());
        if (availableCopies.isEmpty()) {
            throw new BookNotAvailableException(book.getId());
        }

        BookCopy copy = availableCopies.get(0);
        copy.setStatus(CopyStatus.BORROWED);
        bookCopyRepository.save(copy);

        // Create borrow slip
        LocalDateTime now = LocalDateTime.now();
        BorrowSlip slip = BorrowSlip.builder()
                .user(user)
                .borrowDate(now)
                .dueDate(now.plusDays(defaultDueDays))
                .source(BorrowSource.ONLINE)
                .build();
        slip = borrowSlipRepository.save(slip);

        // Create borrow record
        BorrowRecord record = BorrowRecord.builder()
                .copy(copy)
                .slip(slip)
                .status(BorrowStatus.BORROWING)
                .build();
        record = borrowRecordRepository.save(record);

        sendNotification(user, "Mượn sách thành công",
                String.format("Bạn đã mượn \"%s\" (bản #%d). Hạn trả: %s",
                        book.getTitle(), copy.getCopyNumber(), slip.getDueDate().toLocalDate()),
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
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        Page<BorrowRecord> page = borrowRecordRepository.findBySlipUserId(user.getId(), pageable);
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
