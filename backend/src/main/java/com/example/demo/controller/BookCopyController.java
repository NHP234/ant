package com.example.demo.controller;

import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.BookCopyResponse;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.BookCopyMapper;
import com.example.demo.model.entity.Book;
import com.example.demo.model.entity.BookCopy;
import com.example.demo.model.enums.CopyStatus;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.BookRepository;
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

    private final BookCopyRepository bookCopyRepository;
    private final BookRepository bookRepository;
    private final BookCopyMapper bookCopyMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BookCopyResponse>>> getCopies(@PathVariable Long bookId) {
        List<BookCopyResponse> copies = bookCopyRepository.findByBookIdOrderByCopyNumber(bookId)
                .stream().map(bookCopyMapper::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.ok(copies));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BookCopyResponse>> addCopy(@PathVariable Long bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", bookId));

        Integer maxCopy = bookCopyRepository.findMaxCopyNumber(bookId);
        int nextNumber = (maxCopy != null ? maxCopy : 0) + 1;

        BookCopy copy = BookCopy.builder()
                .book(book)
                .copyNumber(nextNumber)
                .status(CopyStatus.AVAILABLE)
                .build();
        copy = bookCopyRepository.save(copy);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(bookCopyMapper.toResponse(copy), "Copy added"));
    }

    @PutMapping("/{copyId}")
    public ResponseEntity<ApiResponse<BookCopyResponse>> updateCopy(
            @PathVariable Long bookId,
            @PathVariable Long copyId,
            @RequestParam(required = false) String nfcTagUid,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String conditionNote) {

        BookCopy copy = bookCopyRepository.findById(copyId)
                .orElseThrow(() -> new ResourceNotFoundException("BookCopy", "id", copyId));

        if (!copy.getBook().getId().equals(bookId)) {
            throw new IllegalArgumentException("Copy does not belong to this book");
        }

        if (nfcTagUid != null) copy.setNfcTagUid(nfcTagUid);
        if (status != null) copy.setStatus(CopyStatus.valueOf(status.toUpperCase()));
        if (conditionNote != null) copy.setConditionNote(conditionNote);

        copy = bookCopyRepository.save(copy);
        return ResponseEntity.ok(ApiResponse.ok(bookCopyMapper.toResponse(copy)));
    }

    @DeleteMapping("/{copyId}")
    public ResponseEntity<Void> deleteCopy(@PathVariable Long bookId, @PathVariable Long copyId) {
        BookCopy copy = bookCopyRepository.findById(copyId)
                .orElseThrow(() -> new ResourceNotFoundException("BookCopy", "id", copyId));

        if (!copy.getBook().getId().equals(bookId)) {
            throw new IllegalArgumentException("Copy does not belong to this book");
        }
        if (copy.getStatus() == CopyStatus.BORROWED) {
            throw new IllegalArgumentException("Cannot delete a copy that is currently borrowed");
        }

        bookCopyRepository.delete(copy);
        return ResponseEntity.noContent().build();
    }
}
