package com.example.demo.service;

import com.example.demo.dto.request.BorrowItemRequest;
import com.example.demo.dto.request.BorrowSlipCreateRequest;
import com.example.demo.dto.response.BorrowSlipResponse;
import com.example.demo.exception.BookNotAvailableException;
import com.example.demo.exception.HoldExpiredException;
import com.example.demo.model.entity.Book;
import com.example.demo.model.entity.BookCopy;
import com.example.demo.model.entity.BookHold;
import com.example.demo.model.entity.User;
import com.example.demo.model.enums.BorrowSource;
import com.example.demo.model.enums.CopyStatus;
import com.example.demo.model.enums.HoldStatus;
import com.example.demo.model.enums.Role;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.BookHoldRepository;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "INTEGRATION_TEST", matches = "true")
@Transactional
class BorrowServiceIntegrationTest {

    @Autowired private BorrowService borrowService;
    @Autowired private UserRepository userRepository;
    @Autowired private BookRepository bookRepository;
    @Autowired private BookCopyRepository bookCopyRepository;
    @Autowired private BookHoldRepository bookHoldRepository;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private EntityManager entityManager;

    @Test
    void createBorrowSlip_persistsTwoRecordsUnderOneSlip() {
        Scenario scenario = createScenario(true);
        BorrowSlipResponse response = borrowService.createBorrowSlip(
                scenario.librarian().getUsername(),
                request(scenario.student().getStudentId(), scenario.firstBook().getId(), scenario.secondBook().getId())
        );

        Integer recordCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM borrow_records WHERE slip_id = ?",
                Integer.class,
                response.getId()
        );
        assertThat(recordCount).isEqualTo(2);
        assertThat(response.getRecords()).hasSize(2);
    }

    @Test
    void createBorrowSlip_rollsBackWhenAnyBookIsUnavailable() {
        Scenario scenario = createScenario(false);
        assertThatThrownBy(() -> borrowService.createBorrowSlip(
                scenario.librarian().getUsername(),
                request(scenario.student().getStudentId(), scenario.firstBook().getId(), scenario.secondBook().getId())
        )).isInstanceOf(BookNotAvailableException.class);

        Integer slipCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM borrow_slips WHERE user_id = ?",
                Integer.class,
                scenario.student().getId()
        );
        String firstCopyStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM book_copies WHERE book_id = ?",
                String.class,
                scenario.firstBook().getId()
        );
        assertThat(slipCount).isZero();
        assertThat(firstCopyStatus).isEqualTo(CopyStatus.AVAILABLE.name());
    }

    @Test
    void confirmExpiredHoldPersistsExpiryBeforeReturningError() {
        Scenario scenario = createScenario(true);
        BookCopy reservedCopy = bookCopyRepository
                .findByBookIdOrderByCopyNumber(scenario.firstBook().getId())
                .getFirst();
        reservedCopy.setStatus(CopyStatus.RESERVED);
        bookCopyRepository.save(reservedCopy);
        BookHold hold = bookHoldRepository.save(BookHold.builder()
                .user(scenario.student())
                .copy(reservedCopy)
                .status(HoldStatus.ACTIVE)
                .reservedAt(LocalDateTime.now().minusDays(2))
                .expiresAt(LocalDateTime.now().minusDays(1))
                .build());

        assertThatThrownBy(() -> borrowService.confirmHold(
                hold.getId(), null, scenario.librarian().getUsername()))
                .isInstanceOf(HoldExpiredException.class);
        entityManager.flush();

        String holdStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM book_holds WHERE id = ?",
                String.class,
                hold.getId());
        String copyStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM book_copies WHERE id = ?",
                String.class,
                reservedCopy.getId());
        Integer notifications = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM notifications
                WHERE user_id = ?
                  AND type IN ('HOLD_EXPIRED', 'HOLD_BAN')
                """,
                Integer.class,
                scenario.student().getId());
        LocalDateTime banUntil = jdbcTemplate.queryForObject(
                "SELECT hold_ban_until FROM users WHERE id = ?",
                LocalDateTime.class,
                scenario.student().getId());

        assertThat(holdStatus).isEqualTo(HoldStatus.EXPIRED.name());
        assertThat(copyStatus).isEqualTo(CopyStatus.AVAILABLE.name());
        assertThat(notifications).isEqualTo(2);
        assertThat(banUntil).isAfter(LocalDateTime.now());
    }

    private Scenario createScenario(boolean secondBookAvailable) {
        String suffix = String.valueOf(System.nanoTime());
        User librarian = userRepository.save(User.builder()
                .username("integration_librarian_" + suffix)
                .passwordHash("test")
                .email("integration_librarian_" + suffix + "@test.local")
                .fullName("Integration Librarian")
                .role(Role.LIBRARIAN)
                .build());
        User student = userRepository.save(User.builder()
                .username("integration_student_" + suffix)
                .passwordHash("test")
                .email("integration_student_" + suffix + "@test.local")
                .fullName("Integration Student")
                .studentId("IT" + suffix)
                .role(Role.STUDENT)
                .build());
        Book firstBook = bookRepository.save(Book.builder()
                .title("Integration First " + suffix)
                .isbn("IT-A-" + suffix)
                .build());
        Book secondBook = bookRepository.save(Book.builder()
                .title("Integration Second " + suffix)
                .isbn("IT-B-" + suffix)
                .build());
        bookCopyRepository.save(BookCopy.builder()
                .book(firstBook)
                .copyNumber(1)
                .status(CopyStatus.AVAILABLE)
                .build());
        if (secondBookAvailable) {
            bookCopyRepository.save(BookCopy.builder()
                    .book(secondBook)
                    .copyNumber(1)
                    .status(CopyStatus.AVAILABLE)
                    .build());
        }
        return new Scenario(librarian, student, firstBook, secondBook);
    }

    private BorrowSlipCreateRequest request(String studentId, Long... bookIds) {
        BorrowSlipCreateRequest request = new BorrowSlipCreateRequest();
        request.setStudentId(studentId);
        request.setSource(BorrowSource.COUNTER);
        request.setItems(List.of(bookIds).stream().map(bookId -> {
            BorrowItemRequest item = new BorrowItemRequest();
            item.setBookId(bookId);
            return item;
        }).toList());
        return request;
    }

    private record Scenario(User librarian, User student, Book firstBook, Book secondBook) {
    }
}
