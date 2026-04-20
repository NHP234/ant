package com.example.demo.controller;

import com.example.demo.dto.request.BorrowRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.BorrowRecordResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.service.BorrowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/borrows")
@RequiredArgsConstructor
public class BorrowController {

    private final BorrowService borrowService;

    @PostMapping
    public ResponseEntity<ApiResponse<BorrowRecordResponse>> borrowBook(
            @Valid @RequestBody BorrowRequest request,
            Authentication authentication) {
        BorrowRecordResponse record = borrowService.borrowBook(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(record, "Book borrowed successfully"));
    }

    @PutMapping("/{id}/return")
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    public ResponseEntity<ApiResponse<BorrowRecordResponse>> returnBook(
            @PathVariable Long id,
            @RequestParam(required = false) String note) {
        BorrowRecordResponse record = borrowService.returnBook(id, note);
        return ResponseEntity.ok(ApiResponse.ok(record, "Book returned successfully"));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<PageResponse<BorrowRecordResponse>>> getMyBorrows(
            @PageableDefault(size = 20, sort = "borrowDate", direction = Sort.Direction.DESC) Pageable pageable,
            Authentication authentication) {
        PageResponse<BorrowRecordResponse> borrows = borrowService.getMyBorrows(authentication.getName(), pageable);
        return ResponseEntity.ok(ApiResponse.ok(borrows));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    public ResponseEntity<ApiResponse<PageResponse<BorrowRecordResponse>>> getAllBorrows(
            @PageableDefault(size = 20, sort = "borrowDate", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<BorrowRecordResponse> borrows = borrowService.getAllBorrows(pageable);
        return ResponseEntity.ok(ApiResponse.ok(borrows));
    }

    @GetMapping("/overdue")
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    public ResponseEntity<ApiResponse<List<BorrowRecordResponse>>> getOverdueBorrows() {
        List<BorrowRecordResponse> borrows = borrowService.getOverdueBorrows();
        return ResponseEntity.ok(ApiResponse.ok(borrows));
    }
}
