package com.example.demo.controller;

import com.example.demo.dto.request.BookSeedDto;
import com.example.demo.dto.request.SeedImportRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.SeedImportResponse;
import com.example.demo.service.SeedImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Quản trị - seed data, vận hành")
public class AdminController {

    private final SeedImportService seedImportService;

    @PostMapping("/seed")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Import hàng loạt sách từ seed data")
    public ResponseEntity<ApiResponse<SeedImportResponse>> seedImport(
            @Valid @RequestBody SeedImportRequest request) {
        List<BookSeedDto> books = request.getBooks();
        SeedImportResponse result = seedImportService.importBooks(books);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
