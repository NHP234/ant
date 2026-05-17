package com.example.demo.controller;

import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.BookCopyResponse;
import com.example.demo.service.BookCopyService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/books/{bookId}/copies")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
@Tag(name = "Book Copies", description = "Quản lý bản sao sách vật lý, gán NFC tag")
public class BookCopyController {

    private final BookCopyService bookCopyService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BookCopyResponse>>> getCopies(@PathVariable Long bookId) {
        List<BookCopyResponse> copies = bookCopyService.getCopies(bookId);
        return ResponseEntity.ok(ApiResponse.ok(copies));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BookCopyResponse>> addCopy(
            @PathVariable Long bookId,
            @RequestParam(required = false) String nfcTagUid) {
        BookCopyResponse copy = bookCopyService.addCopy(bookId, nfcTagUid);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(copy, "Copy added"));
    }

    @PutMapping("/{copyId}")
    public ResponseEntity<ApiResponse<BookCopyResponse>> updateCopy(
            @PathVariable Long bookId,
            @PathVariable Long copyId,
            @RequestParam(required = false) String nfcTagUid,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String conditionNote) {
        BookCopyResponse copy = bookCopyService.updateCopy(bookId, copyId, nfcTagUid, status, conditionNote);
        return ResponseEntity.ok(ApiResponse.ok(copy));
    }

    @DeleteMapping("/{copyId}")
    public ResponseEntity<Void> deleteCopy(@PathVariable Long bookId, @PathVariable Long copyId) {
        bookCopyService.deleteCopy(bookId, copyId);
        return ResponseEntity.noContent().build();
    }
}
