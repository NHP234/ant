package com.example.demo.service;

import com.example.demo.audit.Auditable;
import com.example.demo.dto.request.BorrowItemRequest;
import com.example.demo.dto.request.BorrowRequest;
import com.example.demo.dto.request.BorrowSlipCreateRequest;
import com.example.demo.dto.request.HoldConfirmRequest;
import com.example.demo.dto.response.BorrowRecordResponse;
import com.example.demo.dto.response.BorrowSlipResponse;
import com.example.demo.dto.response.HoldResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.exception.BookNotAvailableException;
import com.example.demo.exception.BorrowLimitExceededException;
import com.example.demo.exception.HoldExpiredException;
import com.example.demo.exception.ResourceNotFoundException;
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
import com.example.demo.model.enums.HoldStatus;
import com.example.demo.model.enums.NotificationType;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.BorrowRecordRepository;
import com.example.demo.repository.BorrowSlipRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class BorrowService {

    private final BorrowRecordRepository borrowRecordRepository;
    private final BorrowSlipRepository borrowSlipRepository;
    private final BookRepository bookRepository;
    private final BookCopyRepository bookCopyRepository;
    private final UserRepository userRepository;
    private final BorrowPolicyService borrowPolicyService;
    private final BookHoldLifecycleService bookHoldLifecycleService;
    private final NotificationService notificationService;
    private final BorrowRecordMapper borrowRecordMapper;
    private final BorrowSlipMapper borrowSlipMapper;
    private final BookHoldMapper bookHoldMapper;
    private final Clock clock;

    @Value("${app.borrow.max-books-per-user}")
    private int maxBooksPerUser;

    @Value("${app.borrow.default-due-days}")
    private int defaultDueDays;

    @Transactional
    @Auditable(action = "BORROW", entityType = "BORROW_RECORD")
    public BorrowRecordResponse borrowBook(String librarianUsername, BorrowRequest request) {
        BorrowSlip slip = createBorrowSlipInternal(librarianUsername, toSlipRequest(request));
        return borrowRecordMapper.toResponse(slip.getRecords().getFirst());
    }

    @Transactional
    @Auditable(action = "BORROW", entityType = "BORROW_SLIP")
    public BorrowSlipResponse createBorrowSlip(
            String librarianUsername,
            BorrowSlipCreateRequest request) {
        return borrowSlipMapper.toResponse(createBorrowSlipInternal(librarianUsername, request));
    }

    @Transactional(noRollbackFor = HoldExpiredException.class)
    @Auditable(action = "BORROW", entityType = "BORROW_RECORD")
    public HoldResponse confirmHold(
            Long holdId,
            HoldConfirmRequest request,
            String librarianUsername) {
        LocalDateTime now = LocalDateTime.now(clock);
        BookHold hold = bookHoldLifecycleService.lockHoldForUpdate(holdId);
        if (hold.getStatus() != HoldStatus.ACTIVE) {
            throw new IllegalArgumentException("Hold is not active");
        }
        if (bookHoldLifecycleService.expireIfDue(hold, now)) {
            throw new HoldExpiredException(holdId);
        }

        User librarian = findUserOrThrow(librarianUsername);
        BookCopy borrowCopy = resolveCopyForHold(hold, request == null ? null : request.getCopyId());
        BorrowSlip slip = createBorrowSlipEntity(
                hold.getUser(),
                librarian,
                resolveBorrowSource(request),
                now);
        createBorrowRecord(slip, borrowCopy);
        bookHoldLifecycleService.fulfillHold(hold, librarian, now);

        notificationService.createNotification(
                hold.getUser(),
                NotificationType.HOLD_FULFILLED,
                "Mượn sách thành công",
                String.format(
                        "Bạn đã mượn \"%s\" từ đặt mượn.",
                        borrowCopy.getBook().getTitle()));
        return bookHoldMapper.toResponse(hold);
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

    private BorrowSlip createBorrowSlipInternal(
            String librarianUsername,
            BorrowSlipCreateRequest request) {
        validateBorrowSlipRequest(request);

        User librarian = findUserOrThrow(librarianUsername);
        User borrower = resolveBorrower(request);
        BorrowSource source = resolveBorrowSource(request);
        LocalDateTime now = LocalDateTime.now(clock);

        List<IndexedBorrowItem> orderedItems = indexAndSortItems(request.getItems());
        List<BorrowIntent> intents = prepareBorrowIntents(borrower, orderedItems, now);
        long directBorrowCount = intents.stream()
                .filter(intent -> intent.hold() == null)
                .count();
        borrowPolicyService.ensureCanBorrow(borrower.getId(), directBorrowCount, now);
        List<BorrowCandidate> candidates = resolveCandidates(intents, source);

        BorrowSlip slip = createBorrowSlipEntity(borrower, librarian, source, now);
        candidates.stream()
                .sorted(Comparator.comparingInt(BorrowCandidate::requestIndex))
                .forEach(candidate -> addBorrowRecord(slip, librarian, candidate, now));
        return slip;
    }

    private void validateBorrowSlipRequest(BorrowSlipCreateRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("At least one borrow item is required");
        }
        if (request.getItems().size() > maxBooksPerUser) {
            throw new BorrowLimitExceededException(maxBooksPerUser);
        }

        Set<Long> bookIds = new HashSet<>();
        Set<Long> copyIds = new HashSet<>();
        for (BorrowItemRequest item : request.getItems()) {
            if (item == null || item.getBookId() == null) {
                throw new IllegalArgumentException("Book ID is required for every borrow item");
            }
            if (!bookIds.add(item.getBookId())) {
                throw new IllegalArgumentException(
                        "Duplicate book is not allowed in the same borrow slip");
            }
            if (item.getCopyId() != null && !copyIds.add(item.getCopyId())) {
                throw new IllegalArgumentException(
                        "Duplicate copy is not allowed in the same borrow slip");
            }
            if (request.getSource() == BorrowSource.NFC && item.getCopyId() == null) {
                throw new IllegalArgumentException("Copy ID is required for NFC borrowing");
            }
        }
    }

    private List<IndexedBorrowItem> indexAndSortItems(List<BorrowItemRequest> items) {
        List<IndexedBorrowItem> indexedItems = new ArrayList<>();
        for (int index = 0; index < items.size(); index++) {
            indexedItems.add(new IndexedBorrowItem(index, items.get(index)));
        }
        indexedItems.sort(Comparator
                .comparing((IndexedBorrowItem item) -> item.request().getBookId())
                .thenComparing(
                        item -> item.request().getCopyId(),
                        Comparator.nullsLast(Long::compareTo)));
        return indexedItems;
    }

    private List<BorrowIntent> prepareBorrowIntents(
            User borrower,
            List<IndexedBorrowItem> items,
            LocalDateTime now) {
        List<BorrowIntent> intents = new ArrayList<>();
        for (IndexedBorrowItem indexedItem : items) {
            BorrowItemRequest item = indexedItem.request();
            Book book = bookRepository.findById(item.getBookId())
                    .orElseThrow(() ->
                            new ResourceNotFoundException("Book", "id", item.getBookId()));

            borrowPolicyService.ensureNotAlreadyBorrowing(borrower.getId(), book.getId());
            BookHold hold = findValidActiveHold(borrower.getId(), book.getId(), now);
            intents.add(new BorrowIntent(indexedItem.index(), item, book, hold));
        }
        return intents;
    }

    private BookHold findValidActiveHold(Long userId, Long bookId, LocalDateTime now) {
        BookHold hold = bookHoldLifecycleService.findActiveHoldForBorrow(userId, bookId);
        if (hold != null && bookHoldLifecycleService.expireIfDue(hold, now)) {
            return null;
        }
        return hold;
    }

    private List<BorrowCandidate> resolveCandidates(
            List<BorrowIntent> intents,
            BorrowSource source) {
        List<BorrowCandidate> candidates = new ArrayList<>();
        for (BorrowIntent intent : intents) {
            BorrowItemRequest item = intent.request();
            BookCopy copy = intent.hold() == null
                    ? resolveCopyForBorrow(intent.book(), item.getCopyId())
                    : resolveCopyForHold(intent.hold(), item.getCopyId());

            if (source == BorrowSource.NFC && !copy.getId().equals(item.getCopyId())) {
                throw new IllegalArgumentException(
                        "Scanned copy does not match the requested copy");
            }
            candidates.add(new BorrowCandidate(
                    intent.requestIndex(), intent.book(), copy, intent.hold()));
        }
        return candidates;
    }

    private BookCopy resolveCopyForHold(BookHold hold, Long copyId) {
        BookCopy reservedCopy = bookCopyRepository.findByIdForUpdate(hold.getCopy().getId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("BookCopy", "id", hold.getCopy().getId()));
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

        List<BookCopy> availableCopies =
                bookCopyRepository.findAvailableCopiesForUpdate(book.getId());
        if (availableCopies.isEmpty()) {
            throw new BookNotAvailableException(book.getId());
        }
        return availableCopies.getFirst();
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

    private BorrowSlip createBorrowSlipEntity(
            User borrower,
            User librarian,
            BorrowSource source,
            LocalDateTime now) {
        return borrowSlipRepository.save(BorrowSlip.builder()
                .user(borrower)
                .librarian(librarian)
                .borrowDate(now)
                .dueDate(now.plusDays(defaultDueDays))
                .source(source)
                .build());
    }

    private BorrowRecord createBorrowRecord(BorrowSlip slip, BookCopy copy) {
        copy.setStatus(CopyStatus.BORROWED);
        bookCopyRepository.save(copy);

        BorrowRecord record = borrowRecordRepository.save(BorrowRecord.builder()
                .copy(copy)
                .slip(slip)
                .status(BorrowStatus.BORROWING)
                .build());
        slip.getRecords().add(record);
        return record;
    }

    private void addBorrowRecord(
            BorrowSlip slip,
            User librarian,
            BorrowCandidate candidate,
            LocalDateTime now) {
        createBorrowRecord(slip, candidate.copy());
        User borrower = slip.getUser();

        if (candidate.hold() != null) {
            bookHoldLifecycleService.fulfillHold(candidate.hold(), librarian, now);
            notificationService.createNotification(
                    borrower,
                    NotificationType.HOLD_FULFILLED,
                    "Mượn sách thành công",
                    String.format(
                            "Bạn đã mượn \"%s\" từ đặt mượn.",
                            candidate.book().getTitle()));
            return;
        }

        notificationService.createNotification(
                borrower,
                NotificationType.BORROW_CONFIRM,
                "Mượn sách thành công",
                String.format(
                        "Bạn đã mượn \"%s\" (bản #%d). Hạn trả: %s",
                        candidate.book().getTitle(),
                        candidate.copy().getCopyNumber(),
                        slip.getDueDate().toLocalDate()));
    }

    private User resolveBorrower(BorrowSlipCreateRequest request) {
        String username = normalizeIdentifier(request.getUsername());
        String studentId = normalizeIdentifier(request.getStudentId());
        if (username == null && studentId == null) {
            throw new IllegalArgumentException(
                    "Borrower identifier is required (username or studentId)");
        }
        if (username != null && studentId != null) {
            throw new IllegalArgumentException("Provide only one of username or studentId");
        }
        if (username != null) {
            return userRepository.findByUsernameForUpdate(username)
                    .orElseThrow(() ->
                            new ResourceNotFoundException("User", "username", username));
        }
        return userRepository.findByStudentIdForUpdate(studentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User", "studentId", studentId));
    }

    private User findUserOrThrow(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User", "username", username));
    }

    private String normalizeIdentifier(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private BorrowSource resolveBorrowSource(BorrowSlipCreateRequest request) {
        return request.getSource() == null ? BorrowSource.COUNTER : request.getSource();
    }

    private BorrowSource resolveBorrowSource(HoldConfirmRequest request) {
        return request == null || request.getSource() == null
                ? BorrowSource.COUNTER
                : request.getSource();
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

    private record IndexedBorrowItem(int index, BorrowItemRequest request) {
    }

    private record BorrowIntent(
            int requestIndex,
            BorrowItemRequest request,
            Book book,
            BookHold hold) {
    }

    private record BorrowCandidate(
            int requestIndex,
            Book book,
            BookCopy copy,
            BookHold hold) {
    }
}
