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
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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
    private final RagBookSyncService ragBookSyncService;

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

    @Transactional(readOnly = true)
    public PageResponse<BookResponse> getBooksByCategory(Long categoryId, Pageable pageable) {
        Page<Book> page = bookRepository.findByCategoriesId(categoryId, pageable);
        List<BookResponse> content = page.getContent().stream()
                .map(this::toResponseWithCopyCounts)
                .toList();
        return PageResponse.from(page, content);
    }

    @Transactional(readOnly = true)
    public PageResponse<BookResponse> getSimilarBooks(Long bookId, Pageable pageable) {
        Book book = findBookOrThrow(bookId);
        Page<Book> page;
        if (book.getCategories() != null && !book.getCategories().isEmpty()) {
            page = bookRepository.findDistinctByCategoriesInAndIdNot(book.getCategories(), bookId, pageable);
        } else {
            page = Page.empty(pageable);
        }
        List<BookResponse> content = page.getContent().stream()
                .map(this::toResponseWithCopyCounts)
                .toList();
        return PageResponse.from(page, content);
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
        syncBookAfterCommit(book.getId());
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
        syncBookAfterCommit(book.getId());
        return response;
    }

    @Transactional
    @CacheEvict(value = "book", key = "#id")
    @Auditable(action = "DELETE", entityType = "BOOK")
    public void deleteBook(Long id) {
        Book book = findBookOrThrow(id);
        bookRepository.delete(book);
        deleteBookFromRagAfterCommit(id);
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

    private void syncBookAfterCommit(Long bookId) {
        runAfterCommit(() -> ragBookSyncService.upsertBook(bookId));
    }

    private void deleteBookFromRagAfterCommit(Long bookId) {
        runAfterCommit(() -> ragBookSyncService.deleteBook(bookId));
    }

    private void runAfterCommit(Runnable task) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            task.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                task.run();
            }
        });
    }
}
