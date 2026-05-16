package com.example.demo.controller;

import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.BorrowSlipResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.BorrowSlipMapper;
import com.example.demo.model.entity.BorrowSlip;
import com.example.demo.model.entity.User;
import com.example.demo.repository.BorrowSlipRepository;
import com.example.demo.repository.UserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/borrow-slips")
@RequiredArgsConstructor
@Tag(name = "Borrow Slips", description = "Phiếu mượn - xem lịch sử phiên mượn")
public class BorrowSlipController {

    private final BorrowSlipRepository borrowSlipRepository;
    private final UserRepository userRepository;
    private final BorrowSlipMapper borrowSlipMapper;

    @GetMapping("/my")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<PageResponse<BorrowSlipResponse>>> getMySlips(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            Authentication authentication) {

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", authentication.getName()));

        Page<BorrowSlip> page = borrowSlipRepository.findByUserId(user.getId(), pageable);
        List<BorrowSlipResponse> content = page.getContent().stream()
                .map(borrowSlipMapper::toResponse).toList();

        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(page, content)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<PageResponse<BorrowSlipResponse>>> getAllSlips(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<BorrowSlip> page = borrowSlipRepository.findAll(pageable);
        List<BorrowSlipResponse> content = page.getContent().stream()
                .map(borrowSlipMapper::toResponse).toList();

        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(page, content)));
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<BorrowSlipResponse>> getSlipById(@PathVariable Long id) {
        BorrowSlip slip = borrowSlipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BorrowSlip", "id", id));
        return ResponseEntity.ok(ApiResponse.ok(borrowSlipMapper.toResponse(slip)));
    }
}
