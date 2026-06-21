package com.example.demo.controller;

import com.example.demo.dto.request.BorrowSlipCreateRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.BorrowSlipResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.service.BorrowService;
import com.example.demo.service.BorrowSlipService;
import io.swagger.v3.oas.annotations.tags.Tag;
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

@RestController
@RequestMapping("/api/borrow-slips")
@RequiredArgsConstructor
@Tag(name = "Borrow Slips", description = "Phiếu mượn - xem lịch sử phiên mượn")
public class BorrowSlipController {

    private final BorrowSlipService borrowSlipService;
    private final BorrowService borrowService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    public ResponseEntity<ApiResponse<BorrowSlipResponse>> createBorrowSlip(
            @Valid @RequestBody BorrowSlipCreateRequest request,
            Authentication authentication) {
        BorrowSlipResponse slip = borrowService.createBorrowSlip(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(slip, "Borrow slip created successfully"));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<PageResponse<BorrowSlipResponse>>> getMySlips(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            Authentication authentication) {
        PageResponse<BorrowSlipResponse> slips =
                borrowSlipService.getMySlips(authentication.getName(), pageable);
        return ResponseEntity.ok(ApiResponse.ok(slips));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    public ResponseEntity<ApiResponse<PageResponse<BorrowSlipResponse>>> getAllSlips(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(borrowSlipService.getAllSlips(pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BorrowSlipResponse>> getSlipById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(borrowSlipService.getSlipById(id)));
    }
}
