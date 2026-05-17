package com.example.demo.service;

import com.example.demo.dto.response.BookCopyResponse;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.BookCopyMapper;
import com.example.demo.model.entity.Book;
import com.example.demo.model.entity.BookCopy;
import com.example.demo.model.enums.CopyStatus;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.BookRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BookCopyService {

    private final BookCopyRepository bookCopyRepository;
    private final BookRepository bookRepository;
    private final BookCopyMapper bookCopyMapper;

    @Transactional(readOnly = true)
    public List<BookCopyResponse> getCopies(Long bookId) {
        return bookCopyRepository.findByBookIdOrderByCopyNumber(bookId)
                .stream()
                .map(bookCopyMapper::toResponse)
                .toList();
    }

    @Transactional
    public BookCopyResponse addCopy(Long bookId, String nfcTagUid) {
        Book book = bookRepository.findByIdForUpdate(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", bookId));

        String trimmedTag = nfcTagUid != null ? nfcTagUid.trim() : null;
        if (trimmedTag != null && !trimmedTag.isBlank()) {
            bookCopyRepository.findByNfcTagUid(trimmedTag).ifPresent(existing -> {
                throw new IllegalArgumentException("NFC tag is already assigned to another copy");
            });
        } else {
            trimmedTag = null;
        }

        Integer maxCopy = bookCopyRepository.findMaxCopyNumber(bookId);
        int nextNumber = (maxCopy != null ? maxCopy : 0) + 1;

        BookCopy copy = BookCopy.builder()
                .book(book)
                .copyNumber(nextNumber)
                .nfcTagUid(trimmedTag)
                .status(CopyStatus.AVAILABLE)
                .build();
        copy = bookCopyRepository.save(copy);

        return bookCopyMapper.toResponse(copy);
    }

    @Transactional
    public BookCopyResponse updateCopy(Long bookId, Long copyId, String nfcTagUid, String status, String conditionNote) {
        BookCopy copy = bookCopyRepository.findById(copyId)
                .orElseThrow(() -> new ResourceNotFoundException("BookCopy", "id", copyId));

        if (!copy.getBook().getId().equals(bookId)) {
            throw new IllegalArgumentException("Copy does not belong to this book");
        }

        if (nfcTagUid != null) copy.setNfcTagUid(nfcTagUid);
        if (status != null) copy.setStatus(CopyStatus.valueOf(status.toUpperCase()));
        if (conditionNote != null) copy.setConditionNote(conditionNote);

        copy = bookCopyRepository.save(copy);
        return bookCopyMapper.toResponse(copy);
    }

    @Transactional
    public void deleteCopy(Long bookId, Long copyId) {
        BookCopy copy = bookCopyRepository.findById(copyId)
                .orElseThrow(() -> new ResourceNotFoundException("BookCopy", "id", copyId));

        if (!copy.getBook().getId().equals(bookId)) {
            throw new IllegalArgumentException("Copy does not belong to this book");
        }
        if (copy.getStatus() == CopyStatus.BORROWED || copy.getStatus() == CopyStatus.RESERVED) {
            throw new IllegalArgumentException("Cannot delete a copy that is reserved or borrowed");
        }

        bookCopyRepository.delete(copy);
    }
}
