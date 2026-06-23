package com.example.demo.controller;

import com.example.demo.dto.request.HoldCancelRequest;
import com.example.demo.dto.request.HoldConfirmRequest;
import com.example.demo.dto.request.HoldCreateRequest;
import com.example.demo.dto.request.HoldPickupRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.BorrowSlipResponse;
import com.example.demo.dto.response.HoldResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.model.enums.HoldStatus;
import com.example.demo.service.BookHoldService;
import com.example.demo.service.BorrowService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/holds")
@RequiredArgsConstructor
@Tag(name = "Holds", description = "Đặt mượn sách (giữ chỗ 24h)")
public class BookHoldController {

    private final BookHoldService bookHoldService;
    private final BorrowService borrowService;

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<HoldResponse>> createHold(
            @Valid @RequestBody HoldCreateRequest request,
            Authentication authentication) {
        HoldResponse hold = bookHoldService.createHold(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(hold, "Hold created successfully"));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<PageResponse<HoldResponse>>> getMyHolds(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestParam(required = false) String statuses,
            Authentication authentication) {
        Page<HoldResponse> page = bookHoldService.getMyHolds(authentication.getName(), parseStatuses(statuses), pageable);
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(page, page.getContent())));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    public ResponseEntity<ApiResponse<PageResponse<HoldResponse>>> getAllHolds(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<HoldResponse> page = bookHoldService.getAllHolds(pageable);
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(page, page.getContent())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    public ResponseEntity<ApiResponse<HoldResponse>> getHoldById(@PathVariable Long id) {
        HoldResponse hold = bookHoldService.getHoldById(id);
        return ResponseEntity.ok(ApiResponse.ok(hold));
    }

    @PutMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    public ResponseEntity<ApiResponse<HoldResponse>> confirmHold(
            @PathVariable Long id,
            @RequestBody(required = false) HoldConfirmRequest request,
            Authentication authentication) {
        HoldResponse hold = borrowService.confirmHold(id, request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(hold, "Hold confirmed"));
    }

    @PostMapping("/pickup")
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    public ResponseEntity<ApiResponse<BorrowSlipResponse>> pickupHolds(
            @RequestBody(required = false) HoldPickupRequest request,
            Authentication authentication) {
        BorrowSlipResponse slip = borrowService.pickupActiveHolds(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(slip, "Hold pickup completed"));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<HoldResponse>> cancelHold(
            @PathVariable Long id,
            @RequestBody(required = false) HoldCancelRequest request,
            Authentication authentication) {
        boolean isAdmin = hasAdminOrLibrarianRole(authentication);
        HoldResponse hold = bookHoldService.cancelHold(id, request, authentication.getName(), isAdmin);
        return ResponseEntity.ok(ApiResponse.ok(hold, "Hold canceled"));
    }

    private boolean hasAdminOrLibrarianRole(Authentication authentication) {
        Set<String> roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
        return roles.contains("ROLE_ADMIN") || roles.contains("ROLE_LIBRARIAN");
    }

    private List<HoldStatus> parseStatuses(String statuses) {
        if (statuses == null || statuses.isBlank()) {
            return List.of();
        }

        return Arrays.stream(statuses.split(","))
                .map(String::trim)
                .filter(status -> !status.isBlank())
                .map(status -> HoldStatus.valueOf(status.toUpperCase(Locale.ROOT)))
                .toList();
    }
}
