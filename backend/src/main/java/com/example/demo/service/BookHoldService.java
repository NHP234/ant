package com.example.demo.service;

import com.example.demo.dto.request.HoldCancelRequest;
import com.example.demo.dto.request.HoldCreateRequest;
import com.example.demo.dto.response.HoldResponse;
import com.example.demo.exception.BookNotAvailableException;
import com.example.demo.exception.HoldExpiredException;
import com.example.demo.exception.ResourceNotFoundException;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookHoldService {

    private final BookHoldRepository bookHoldRepository;
    private final BookRepository bookRepository;
    private final BookCopyRepository bookCopyRepository;
    private final UserRepository userRepository;
    private final BookHoldMapper bookHoldMapper;
    private final BorrowPolicyService borrowPolicyService;
    private final BookHoldLifecycleService bookHoldLifecycleService;
    private final NotificationService notificationService;
    private final Clock clock;

    @Value("${app.hold.expire-hours:24}")
    private int holdExpireHours;

    @Transactional
    public HoldResponse createHold(String username, HoldCreateRequest request) {
        User user = findUserForUpdateOrThrow(username);
        if (user.getRole() != Role.STUDENT) {
            throw new IllegalArgumentException("Only students can place holds");
        }
        LocalDateTime now = LocalDateTime.now(clock);

        if (user.getHoldBanUntil() != null && user.getHoldBanUntil().isAfter(now)) {
            throw new IllegalArgumentException("You are temporarily banned from placing holds");
        }

        Book book = bookRepository.findById(request.getBookId())
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", request.getBookId()));
        BookHold existingHold =
                bookHoldLifecycleService.findActiveHoldForBorrow(user.getId(), book.getId());
        if (existingHold != null) {
            bookHoldLifecycleService.expireIfDue(existingHold, now);
        }
        borrowPolicyService.ensureCanCreateHold(user.getId(), book.getId(), now);

        List<BookCopy> availableCopies = bookCopyRepository.findAvailableCopiesForUpdate(book.getId());
        if (availableCopies.isEmpty()) {
            throw new BookNotAvailableException(book.getId());
        }

        BookCopy reservedCopy = availableCopies.getFirst();
        reservedCopy.setStatus(CopyStatus.RESERVED);
        bookCopyRepository.save(reservedCopy);

        BookHold hold = bookHoldRepository.save(BookHold.builder()
                .user(user)
                .copy(reservedCopy)
                .status(HoldStatus.ACTIVE)
                .reservedAt(now)
                .expiresAt(now.plusHours(holdExpireHours))
                .build());

        notificationService.createNotification(
                user,
                NotificationType.HOLD_CREATED,
                "Đặt mượn thành công",
                String.format(
                        "Bạn đã đặt mượn \"%s\". Vui lòng đến lấy trước %s.",
                        book.getTitle(),
                        hold.getExpiresAt()));
        return bookHoldMapper.toResponse(hold);
    }

    @Transactional(noRollbackFor = HoldExpiredException.class)
    public HoldResponse cancelHold(
            Long holdId,
            HoldCancelRequest request,
            String username,
            boolean isStaff) {
        BookHold hold = bookHoldLifecycleService.lockHoldForUpdate(holdId);
        if (hold.getStatus() != HoldStatus.ACTIVE) {
            throw new IllegalArgumentException("Hold is not active");
        }
        if (!isStaff && !hold.getUser().getUsername().equals(username)) {
            throw new IllegalArgumentException("You are not allowed to cancel this hold");
        }

        LocalDateTime now = LocalDateTime.now(clock);
        if (bookHoldLifecycleService.expireIfDue(hold, now)) {
            throw new HoldExpiredException(holdId);
        }

        User librarian = isStaff ? findUserOrThrow(username) : null;
        String reason = resolveCancelReason(request, isStaff);
        hold = bookHoldLifecycleService.cancelHold(hold, librarian, reason, now);

        notificationService.createNotification(
                hold.getUser(),
                NotificationType.HOLD_CANCELED,
                "Đặt mượn đã hủy",
                String.format("Đặt mượn \"%s\" đã bị hủy.", hold.getCopy().getBook().getTitle()));
        return bookHoldMapper.toResponse(hold);
    }

    public int expireHolds() {
        LocalDateTime now = LocalDateTime.now(clock);
        List<Long> holdIds = bookHoldRepository.findIdsByStatusAndExpiredAt(HoldStatus.ACTIVE, now);
        int expiredCount = 0;

        for (Long holdId : holdIds) {
            try {
                if (bookHoldLifecycleService.expireHoldById(holdId, now)) {
                    expiredCount++;
                }
            } catch (RuntimeException exception) {
                log.warn("Failed to expire hold {}", holdId, exception);
            }
        }
        return expiredCount;
    }

    @Transactional(readOnly = true)
    public Page<HoldResponse> getMyHolds(String username, Pageable pageable) {
        return getMyHolds(username, List.of(), pageable);
    }

    @Transactional(readOnly = true)
    public Page<HoldResponse> getMyHolds(
            String username,
            List<HoldStatus> statuses,
            Pageable pageable) {
        User user = findUserOrThrow(username);
        Page<BookHold> page = (statuses == null || statuses.isEmpty())
                ? bookHoldRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable)
                : bookHoldRepository.findByUserIdAndStatusInOrderByCreatedAtDesc(
                        user.getId(), statuses, pageable);
        return page.map(bookHoldMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<HoldResponse> getAllHolds(String search, Pageable pageable) {
        if (search != null && !search.trim().isEmpty()) {
            return bookHoldRepository.searchByBorrower(search.trim(), pageable).map(bookHoldMapper::toResponse);
        }
        return bookHoldRepository.findAll(pageable).map(bookHoldMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public HoldResponse getHoldById(Long holdId) {
        BookHold hold = bookHoldRepository.findById(holdId)
                .orElseThrow(() -> new ResourceNotFoundException("BookHold", "id", holdId));
        return bookHoldMapper.toResponse(hold);
    }

    private String resolveCancelReason(HoldCancelRequest request, boolean isStaff) {
        String reason = request == null ? null : request.getReason();
        if (reason == null || reason.isBlank()) {
            return isStaff ? "STAFF_CANCELED" : "USER_CANCELED";
        }
        return reason;
    }

    private User findUserOrThrow(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
    }

    private User findUserForUpdateOrThrow(String username) {
        return userRepository.findByUsernameForUpdate(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
    }
}
