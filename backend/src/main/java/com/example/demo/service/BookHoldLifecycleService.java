package com.example.demo.service;

import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.model.entity.BookCopy;
import com.example.demo.model.entity.BookHold;
import com.example.demo.model.entity.User;
import com.example.demo.model.enums.CopyStatus;
import com.example.demo.model.enums.HoldStatus;
import com.example.demo.model.enums.NotificationType;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.BookHoldRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class BookHoldLifecycleService {

    private final BookHoldRepository bookHoldRepository;
    private final BookCopyRepository bookCopyRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Value("${app.hold.ban-days:7}")
    private int holdBanDays;

    public BookHold lockHoldForUpdate(Long holdId) {
        Long userId = bookHoldRepository.findUserIdById(holdId)
                .orElseThrow(() -> new ResourceNotFoundException("BookHold", "id", holdId));
        userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        return bookHoldRepository.findByIdAndUserIdForUpdate(holdId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("BookHold", "id", holdId));
    }

    public BookHold findActiveHoldForBorrow(Long userId, Long bookId) {
        return bookHoldRepository
                .findFirstByUserIdAndCopyBookIdAndStatusOrderByCreatedAtDesc(
                        userId, bookId, HoldStatus.ACTIVE)
                .orElse(null);
    }

    public boolean expireIfDue(BookHold hold, LocalDateTime now) {
        if (hold.getStatus() != HoldStatus.ACTIVE || hold.getExpiresAt().isAfter(now)) {
            return false;
        }
        expireLockedHold(hold, now);
        return true;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean expireHoldById(Long holdId, LocalDateTime now) {
        BookHold hold = lockHoldForUpdate(holdId);
        return expireIfDue(hold, now);
    }

    public BookHold fulfillHold(BookHold hold, User librarian, LocalDateTime now) {
        if (hold.getStatus() != HoldStatus.ACTIVE) {
            throw new IllegalArgumentException("Hold is not active");
        }
        hold.setStatus(HoldStatus.FULFILLED);
        hold.setFulfilledAt(now);
        hold.setLibrarian(librarian);
        return bookHoldRepository.save(hold);
    }

    public BookHold cancelHold(
            BookHold hold,
            User librarian,
            String reason,
            LocalDateTime now) {
        if (hold.getStatus() != HoldStatus.ACTIVE) {
            throw new IllegalArgumentException("Hold is not active");
        }

        hold.setStatus(HoldStatus.CANCELED);
        hold.setCanceledAt(now);
        hold.setCancelReason(reason);
        hold.setLibrarian(librarian);
        BookHold savedHold = bookHoldRepository.save(hold);
        releaseReservedCopy(hold.getCopy());
        return savedHold;
    }

    private void expireLockedHold(BookHold hold, LocalDateTime now) {
        hold.setStatus(HoldStatus.EXPIRED);
        hold.setCanceledAt(now);
        hold.setCancelReason("EXPIRED_NO_PICKUP");
        bookHoldRepository.save(hold);
        releaseReservedCopy(hold.getCopy());

        User user = hold.getUser();
        LocalDateTime banUntil = now.plusDays(holdBanDays);
        if (user.getHoldBanUntil() == null || user.getHoldBanUntil().isBefore(banUntil)) {
            user.setHoldBanUntil(banUntil);
            userRepository.save(user);
        }

        notificationService.createNotification(
                user,
                NotificationType.HOLD_EXPIRED,
                "Đặt mượn đã hết hạn",
                String.format(
                        "Đặt mượn \"%s\" đã hết hạn. Bạn bị tạm khóa đặt mượn đến %s.",
                        hold.getCopy().getBook().getTitle(),
                        banUntil));
        notificationService.createNotification(
                user,
                NotificationType.HOLD_BAN,
                "Tạm khóa đặt mượn",
                String.format("Bạn không thể đặt mượn trong %d ngày.", holdBanDays));
    }

    private void releaseReservedCopy(BookCopy copy) {
        BookCopy lockedCopy = bookCopyRepository.findByIdForUpdate(copy.getId())
                .orElseThrow(() -> new ResourceNotFoundException("BookCopy", "id", copy.getId()));
        if (lockedCopy.getStatus() == CopyStatus.RESERVED) {
            lockedCopy.setStatus(CopyStatus.AVAILABLE);
            bookCopyRepository.save(lockedCopy);
        }
    }
}
