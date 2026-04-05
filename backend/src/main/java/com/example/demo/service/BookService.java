package com.example.demo.service;

import com.example.demo.dto.request.BookCreateRequest;
import com.example.demo.dto.request.BookUpdateRequest;
import com.example.demo.dto.response.BookResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.BookMapper;
import com.example.demo.model.entity.Book;
import com.example.demo.model.entity.Category;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class BookService {

    private final BookRepository bookRepository;
    private final CategoryRepository categoryRepository;
    private final BookMapper bookMapper;

    public PageResponse<BookResponse> getAllBooks(Pageable pageable) {
        Page<Book> page = bookRepository.findAll(pageable);
        List<BookResponse> content = page.getContent().stream()
                .map(bookMapper::toResponse)
                .toList();
        return PageResponse.from(page, content);
    }

    public PageResponse<BookResponse> searchBooks(String query, Pageable pageable) {
        Page<Book> page = bookRepository.findByTitleContainingIgnoreCase(query, pageable);
        List<BookResponse> content = page.getContent().stream()
                .map(bookMapper::toResponse)
                .toList();
        return PageResponse.from(page, content);
    }

    public BookResponse getBookById(Long id) {
        Book book = findBookOrThrow(id);
        return bookMapper.toResponse(book);
    }

    @Transactional
    public BookResponse createBook(BookCreateRequest request) {
        Book book = bookMapper.toEntity(request);

        if (request.getCategoryIds() != null && !request.getCategoryIds().isEmpty()) {
            Set<Category> categories = new HashSet<>(categoryRepository.findAllById(request.getCategoryIds()));
            book.setCategories(categories);
        }

        book = bookRepository.save(book);
        return bookMapper.toResponse(book);
    }

    @Transactional
    public BookResponse updateBook(Long id, BookUpdateRequest request) {
        Book book = findBookOrThrow(id);

        bookMapper.updateEntity(request, book);

        if (request.getQuantity() != null) {
            int diff = request.getQuantity() - book.getQuantity();
            book.setQuantity(request.getQuantity());
            book.setAvailableQuantity(Math.max(0, book.getAvailableQuantity() + diff));
        }

        if (request.getCategoryIds() != null) {
            Set<Category> categories = new HashSet<>(categoryRepository.findAllById(request.getCategoryIds()));
            book.setCategories(categories);
        }

        book = bookRepository.save(book);
        return bookMapper.toResponse(book);
    }

    @Transactional
    public void deleteBook(Long id) {
        Book book = findBookOrThrow(id);
        bookRepository.delete(book);
    }

    private Book findBookOrThrow(Long id) {
        return bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", id));
    }
}
