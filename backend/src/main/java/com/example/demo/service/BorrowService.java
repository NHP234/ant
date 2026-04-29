package com.example.demo.service;

import com.example.demo.audit.Auditable;
import com.example.demo.dto.request.BorrowRequest;
import com.example.demo.dto.response.BorrowRecordResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.exception.BookNotAvailableException;
import com.example.demo.exception.BorrowLimitExceededException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.BorrowRecordMapper;
import com.example.demo.model.entity.Book;
import com.example.demo.model.entity.BorrowRecord;
import com.example.demo.model.entity.Notification;
import com.example.demo.model.entity.User;
import com.example.demo.model.enums.BorrowStatus;
import com.example.demo.model.enums.NotificationType;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.BorrowRecordRepository;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.UserRepository;
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
    private final BookRepository bookRepository;
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

        int activeBorrows = borrowRecordRepository.countByUserIdAndStatus(user.getId(), BorrowStatus.BORROWING);
        if (activeBorrows >= maxBooksPerUser) {
            throw new BorrowLimitExceededException(maxBooksPerUser);
        }

        if (borrowRecordRepository.existsByUserIdAndBookIdAndStatus(user.getId(), book.getId(), BorrowStatus.BORROWING)) {
            throw new IllegalArgumentException("You are already borrowing this book");
        }

        int updated = bookRepository.decrementAvailableQuantity(book.getId());
        if (updated == 0) {
            throw new BookNotAvailableException(book.getId());
        }

        LocalDateTime now = LocalDateTime.now();
        BorrowRecord record = BorrowRecord.builder()
                .user(user)
                .book(book)
                .borrowDate(now)
                .dueDate(now.plusDays(defaultDueDays))
                .status(BorrowStatus.BORROWING)
                .build();

        record = borrowRecordRepository.save(record);

        sendNotification(user, "Mượn sách thành công",
                String.format("Bạn đã mượn \"%s\". Hạn trả: %s", book.getTitle(), record.getDueDate().toLocalDate()),
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

        bookRepository.incrementAvailableQuantity(record.getBook().getId());
        record = borrowRecordRepository.save(record);

        sendNotification(record.getUser(), "Trả sách thành công",
                String.format("Bạn đã trả \"%s\".", record.getBook().getTitle()),
                NotificationType.RETURN_CONFIRM);

        return borrowRecordMapper.toResponse(record);
    }

    public PageResponse<BorrowRecordResponse> getMyBorrows(String username, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        Page<BorrowRecord> page = borrowRecordRepository.findByUserId(user.getId(), pageable);
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
                .findByStatusAndDueDateBefore(BorrowStatus.BORROWING, LocalDateTime.now());
        return records.stream()
                .map(borrowRecordMapper::toResponse)
                .toList();
    }

    @Transactional
    public void checkAndMarkOverdue() {
        List<BorrowRecord> overdueRecords = borrowRecordRepository
                .findByStatusAndDueDateBefore(BorrowStatus.BORROWING, LocalDateTime.now());

        for (BorrowRecord record : overdueRecords) {
            record.setStatus(BorrowStatus.OVERDUE);
            borrowRecordRepository.save(record);

            sendNotification(record.getUser(), "Sách quá hạn",
                    String.format("Sách \"%s\" đã quá hạn trả. Vui lòng trả sớm.", record.getBook().getTitle()),
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
