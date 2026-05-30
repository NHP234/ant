package com.example.demo.service;

import com.example.demo.audit.Auditable;
import com.example.demo.dto.request.BookCreateRequest;
import com.example.demo.dto.request.BookUpdateRequest;
import com.example.demo.dto.response.BookResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.BookMapper;
import com.example.demo.model.entity.Book;
import com.example.demo.model.entity.BookCopy;
import com.example.demo.model.entity.Category;
import com.example.demo.model.enums.CopyStatus;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.AuthorRepository;
import com.example.demo.model.entity.Author;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
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
    private final BookCopyRepository bookCopyRepository;
    private final CategoryRepository categoryRepository;
    private final AuthorRepository authorRepository;
    private final BookMapper bookMapper;

    @org.springframework.beans.factory.annotation.Value("${app.rag.service-url:http://localhost:8000}")
    private String ragServiceUrl;

    @org.springframework.beans.factory.annotation.Value("${app.rag.internal-key:SuperSecretInternalApiKey123!}")
    private String internalApiKey;

    public PageResponse<BookResponse> getAllBooks(Pageable pageable) {
        Page<Book> page = bookRepository.findAll(pageable);
        List<BookResponse> content = page.getContent().stream()
                .map(this::toResponseWithCopyCounts)
                .toList();
        return PageResponse.from(page, content);
    }

    public PageResponse<BookResponse> searchBooks(String query, Pageable pageable) {
        String tsQuery = query.trim().replaceAll("\\s+", " & ");
        Page<Book> page = bookRepository.fullTextSearch(tsQuery, pageable);

        if (page.isEmpty()) {
            page = bookRepository.findByTitleContainingIgnoreCase(query, pageable);
        }

        List<BookResponse> content = page.getContent().stream()
                .map(this::toResponseWithCopyCounts)
                .toList();
        return PageResponse.from(page, content);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "book", key = "#id")
    public BookResponse getBookById(Long id) {
        Book book = findBookOrThrow(id);
        return toResponseWithCopyCounts(book);
    }

    @Transactional
    @CacheEvict(value = "book", allEntries = true)
    @Auditable(action = "CREATE", entityType = "BOOK")
    public BookResponse createBook(BookCreateRequest request) {
        Book book = bookMapper.toEntity(request);

        updateBookAuthors(book, request.getAuthor());

        if (request.getCategoryIds() != null && !request.getCategoryIds().isEmpty()) {
            Set<Category> categories = new HashSet<>(categoryRepository.findAllById(request.getCategoryIds()));
            book.setCategories(categories);
        }

        book = bookRepository.save(book);

        // Auto-create copies based on quantity
        int quantity = request.getQuantity() != null ? request.getQuantity() : 1;
        for (int i = 1; i <= quantity; i++) {
            BookCopy copy = BookCopy.builder()
                    .book(book)
                    .copyNumber(i)
                    .status(CopyStatus.AVAILABLE)
                    .build();
            bookCopyRepository.save(copy);
        }

        BookResponse response = toResponseWithCopyCounts(book);
        triggerReIngest();
        return response;
    }

    @Transactional
    @CacheEvict(value = "book", key = "#id")
    @Auditable(action = "UPDATE", entityType = "BOOK")
    public BookResponse updateBook(Long id, BookUpdateRequest request) {
        Book book = findBookOrThrow(id);

        bookMapper.updateEntity(request, book);

        if (request.getAuthor() != null) {
            updateBookAuthors(book, request.getAuthor());
        }

        if (request.getCategoryIds() != null) {
            Set<Category> categories = new HashSet<>(categoryRepository.findAllById(request.getCategoryIds()));
            book.setCategories(categories);
        }

        book = bookRepository.save(book);
        BookResponse response = toResponseWithCopyCounts(book);
        triggerReIngest();
        return response;
    }

    @Transactional
    @CacheEvict(value = "book", key = "#id")
    @Auditable(action = "DELETE", entityType = "BOOK")
    public void deleteBook(Long id) {
        Book book = findBookOrThrow(id);
        bookRepository.delete(book);
        triggerReIngest();
    }

    private Book findBookOrThrow(Long id) {
        return bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", id));
    }

    /**
     * Map Book entity to BookResponse with computed copy counts.
     */
    private BookResponse toResponseWithCopyCounts(Book book) {
        BookResponse response = bookMapper.toResponse(book);
        response.setTotalCopies(bookCopyRepository.countByBookId(book.getId()));
        response.setAvailableCopies(bookCopyRepository.countByBookIdAndStatus(book.getId(), CopyStatus.AVAILABLE));
        return response;
    }

    /**
     * Kích hoạt đồng bộ hóa vector database sách không đồng bộ (bất đồng bộ).
     */
    @org.springframework.scheduling.annotation.Async
    public void triggerReIngest() {
        try {
            org.springframework.web.client.RestClient.create()
                    .post()
                    .uri(ragServiceUrl + "/api/ingest")
                    .header("X-Internal-Key", internalApiKey)
                    .retrieve()
                    .toBodilessEntity();
            org.slf4j.LoggerFactory.getLogger(BookService.class).info("RAG ingest trigger sent successfully.");
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(BookService.class).warn("RAG ingest trigger failed (non-critical): {}", e.getMessage());
        }
    }

    private void updateBookAuthors(Book book, String authorStr) {
        if (authorStr == null || authorStr.isBlank()) {
            return;
        }

        Set<Author> authors = new HashSet<>();
        String[] authorNames = authorStr.split(",");
        for (String name : authorNames) {
            String trimmedName = name.trim();
            if (!trimmedName.isEmpty()) {
                Author author = authorRepository.findByName(trimmedName)
                        .orElseGet(() -> authorRepository.save(Author.builder().name(trimmedName).build()));
                authors.add(author);
            }
        }
        book.setAuthors(authors);
    }
}
