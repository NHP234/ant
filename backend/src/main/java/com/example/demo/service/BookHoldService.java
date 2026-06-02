package com.example.demo.service;

import com.example.demo.dto.request.HoldCancelRequest;
import com.example.demo.dto.request.HoldConfirmRequest;
import com.example.demo.dto.request.HoldCreateRequest;
import com.example.demo.dto.response.HoldResponse;
import com.example.demo.exception.BookNotAvailableException;
import com.example.demo.exception.BorrowLimitExceededException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.BookHoldMapper;
import com.example.demo.model.entity.*;
import com.example.demo.model.enums.*;
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
public class BookHoldService {

    private final BookHoldRepository bookHoldRepository;
    private final BookRepository bookRepository;
    private final BookCopyRepository bookCopyRepository;
    private final BorrowSlipRepository borrowSlipRepository;
    private final BorrowRecordRepository borrowRecordRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final BookHoldMapper bookHoldMapper;

    @Value("${app.borrow.max-books-per-user}")
    private int maxBooksPerUser;

    @Value("${app.borrow.default-due-days}")
    private int defaultDueDays;

    @Value("${app.hold.expire-hours:24}")
    private int holdExpireHours;

    @Value("${app.hold.ban-days:7}")
    private int holdBanDays;

    @Transactional
    public HoldResponse createHold(String username, HoldCreateRequest request) {
        User user = findUserOrThrow(username);
        LocalDateTime now = LocalDateTime.now();

        if (user.getHoldBanUntil() != null && user.getHoldBanUntil().isAfter(now)) {
            throw new IllegalArgumentException("You are temporarily banned from placing holds");
        }

        Book book = bookRepository.findById(request.getBookId())
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", request.getBookId()));

        int activeBorrows = borrowRecordRepository.countBySlipUserIdAndStatusIn(
                user.getId(), List.of(BorrowStatus.BORROWING, BorrowStatus.OVERDUE));
        long activeHolds = bookHoldRepository.countByUserIdAndStatusIn(
                user.getId(), List.of(HoldStatus.ACTIVE));
        if (activeBorrows + activeHolds >= maxBooksPerUser) {
            throw new BorrowLimitExceededException(maxBooksPerUser);
        }

        boolean alreadyBorrowing = borrowRecordRepository.existsBySlipUserIdAndBookIdAndStatusIn(
                user.getId(), book.getId(), List.of(BorrowStatus.BORROWING, BorrowStatus.OVERDUE));
        if (alreadyBorrowing) {
            throw new IllegalArgumentException("You are already borrowing this book");
        }

        boolean alreadyHolding = bookHoldRepository.existsByUserIdAndBookIdAndStatusIn(
                user.getId(), book.getId(), List.of(HoldStatus.ACTIVE));
        if (alreadyHolding) {
            throw new IllegalArgumentException("You already have an active hold for this book");
        }

        List<BookCopy> availableCopies = bookCopyRepository.findAvailableCopiesForUpdate(book.getId());
        if (availableCopies.isEmpty()) {
            throw new BookNotAvailableException(book.getId());
        }

        BookCopy reservedCopy = availableCopies.get(0);
        reservedCopy.setStatus(CopyStatus.RESERVED);
        bookCopyRepository.save(reservedCopy);

        BookHold hold = BookHold.builder()
                .user(user)
                .copy(reservedCopy)
                .status(HoldStatus.ACTIVE)
                .reservedAt(now)
                .expiresAt(now.plusHours(holdExpireHours))
                .build();
        hold = bookHoldRepository.save(hold);

        sendNotification(user,
                "Đặt mượn thành công",
                String.format("Bạn đã đặt mượn \"%s\". Vui lòng đến lấy trước %s.",
                        book.getTitle(), hold.getExpiresAt()),
                NotificationType.HOLD_CREATED);

        return bookHoldMapper.toResponse(hold);
    }

    @Transactional
    public HoldResponse confirmHold(Long holdId, HoldConfirmRequest request, String librarianUsername) {
        BookHold hold = bookHoldRepository.findById(holdId)
                .orElseThrow(() -> new ResourceNotFoundException("BookHold", "id", holdId));

        if (hold.getStatus() != HoldStatus.ACTIVE) {
            throw new IllegalArgumentException("Hold is not active");
        }

        LocalDateTime now = LocalDateTime.now();
        if (hold.getExpiresAt().isBefore(now)) {
            expireHoldInternal(hold, now, true);
            throw new IllegalArgumentException("Hold has expired");
        }

        User librarian = null;
        if (librarianUsername != null) {
            librarian = findUserOrThrow(librarianUsername);
        }

        BookCopy reservedCopy = hold.getCopy();
        BookCopy borrowCopy = reservedCopy;

        if (reservedCopy.getStatus() != CopyStatus.RESERVED) {
            throw new IllegalStateException("Reserved copy is not in RESERVED status");
        }

        if (request != null && request.getCopyId() != null && !request.getCopyId().equals(reservedCopy.getId())) {
            BookCopy requestedCopy = bookCopyRepository.findByIdForUpdate(request.getCopyId())
                    .orElseThrow(() -> new ResourceNotFoundException("BookCopy", "id", request.getCopyId()));

            if (!requestedCopy.getBook().getId().equals(reservedCopy.getBook().getId())) {
                throw new IllegalArgumentException("Requested copy is not the same book");
            }

            if (requestedCopy.getStatus() != CopyStatus.AVAILABLE) {
                throw new IllegalArgumentException("Requested copy is not available");
            }

            reservedCopy.setStatus(CopyStatus.AVAILABLE);
            bookCopyRepository.save(reservedCopy);

            borrowCopy = requestedCopy;
            hold.setCopy(borrowCopy);
        }

        borrowCopy.setStatus(CopyStatus.BORROWED);
        bookCopyRepository.save(borrowCopy);

        BorrowSource source = (request != null && request.getCopyId() != null) ? BorrowSource.NFC : BorrowSource.COUNTER;
        BorrowSlip slip = BorrowSlip.builder()
                .user(hold.getUser())
                .librarian(librarian)
                .borrowDate(now)
                .dueDate(now.plusDays(defaultDueDays))
                .source(source)
                .build();
        slip = borrowSlipRepository.save(slip);

        BorrowRecord record = BorrowRecord.builder()
                .copy(borrowCopy)
                .slip(slip)
                .status(BorrowStatus.BORROWING)
                .build();
        borrowRecordRepository.save(record);

        hold.setStatus(HoldStatus.FULFILLED);
        hold.setFulfilledAt(now);
        hold.setLibrarian(librarian);
        hold = bookHoldRepository.save(hold);

        sendNotification(hold.getUser(),
                "Mượn sách thành công",
                String.format("Bạn đã mượn \"%s\" từ đặt mượn.", borrowCopy.getBook().getTitle()),
                NotificationType.HOLD_FULFILLED);

        return bookHoldMapper.toResponse(hold);
    }

    @Transactional
    public HoldResponse cancelHold(Long holdId, HoldCancelRequest request, String username, boolean isAdmin) {
        BookHold hold = bookHoldRepository.findById(holdId)
                .orElseThrow(() -> new ResourceNotFoundException("BookHold", "id", holdId));

        if (hold.getStatus() != HoldStatus.ACTIVE) {
            throw new IllegalArgumentException("Hold is not active");
        }

        if (!isAdmin && !hold.getUser().getUsername().equals(username)) {
            throw new IllegalArgumentException("You are not allowed to cancel this hold");
        }

        LocalDateTime now = LocalDateTime.now();
        hold.setStatus(HoldStatus.CANCELED);
        hold.setCanceledAt(now);
        String reason = request != null ? request.getReason() : null;
        if (reason == null || reason.isBlank()) {
            reason = isAdmin ? "ADMIN_CANCELED" : "USER_CANCELED";
        }
        hold.setCancelReason(reason);
        if (isAdmin) {
            User librarian = findUserOrThrow(username);
            hold.setLibrarian(librarian);
        }
        hold = bookHoldRepository.save(hold);

        releaseCopyIfReserved(hold.getCopy());

        sendNotification(hold.getUser(),
                "Đặt mượn đã hủy",
                String.format("Đặt mượn \"%s\" đã bị hủy.", hold.getCopy().getBook().getTitle()),
                NotificationType.HOLD_CANCELED);

        return bookHoldMapper.toResponse(hold);
    }

    @Transactional
    public int expireHolds() {
        LocalDateTime now = LocalDateTime.now();
        List<BookHold> expiredHolds = bookHoldRepository.findByStatusAndExpiresAtBefore(HoldStatus.ACTIVE, now);

        for (BookHold hold : expiredHolds) {
            expireHoldInternal(hold, now, false);
        }

        return expiredHolds.size();
    }

    @Transactional(readOnly = true)
    public Page<HoldResponse> getMyHolds(String username, Pageable pageable) {
        return getMyHolds(username, List.of(), pageable);
    }

    @Transactional(readOnly = true)
    public Page<HoldResponse> getMyHolds(String username, List<HoldStatus> statuses, Pageable pageable) {
        User user = findUserOrThrow(username);
        Page<BookHold> page = (statuses == null || statuses.isEmpty())
                ? bookHoldRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable)
                : bookHoldRepository.findByUserIdAndStatusInOrderByCreatedAtDesc(user.getId(), statuses, pageable);
        return page.map(bookHoldMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<HoldResponse> getAllHolds(Pageable pageable) {
        Page<BookHold> page = bookHoldRepository.findAll(pageable);
        return page.map(bookHoldMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public HoldResponse getHoldById(Long holdId) {
        BookHold hold = bookHoldRepository.findById(holdId)
                .orElseThrow(() -> new ResourceNotFoundException("BookHold", "id", holdId));
        return bookHoldMapper.toResponse(hold);
    }

    private void expireHoldInternal(BookHold hold, LocalDateTime now, boolean skipNotification) {
        hold.setStatus(HoldStatus.EXPIRED);
        hold.setCanceledAt(now);
        hold.setCancelReason("EXPIRED_NO_PICKUP");
        bookHoldRepository.save(hold);

        releaseCopyIfReserved(hold.getCopy());

        User user = hold.getUser();
        LocalDateTime banUntil = now.plusDays(holdBanDays);
        if (user.getHoldBanUntil() == null || user.getHoldBanUntil().isBefore(banUntil)) {
            user.setHoldBanUntil(banUntil);
            userRepository.save(user);
        }

        if (!skipNotification) {
            sendNotification(user,
                    "Đặt mượn đã hết hạn",
                    String.format("Đặt mượn \"%s\" đã hết hạn. Bạn bị tạm khóa đặt mượn đến %s.",
                            hold.getCopy().getBook().getTitle(), banUntil),
                    NotificationType.HOLD_EXPIRED);
            sendNotification(user,
                    "Tạm khóa đặt mượn",
                    String.format("Bạn không thể đặt mượn trong %d ngày.", holdBanDays),
                    NotificationType.HOLD_BAN);
        }
    }

    private void releaseCopyIfReserved(BookCopy copy) {
        if (copy.getStatus() == CopyStatus.RESERVED) {
            copy.setStatus(CopyStatus.AVAILABLE);
            bookCopyRepository.save(copy);
        }
    }

    private User findUserOrThrow(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
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
