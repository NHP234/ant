package com.example.demo.service;

import com.example.demo.dto.request.BookSeedDto;
import com.example.demo.dto.response.SeedImportResponse;
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
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SeedImportService {

    private final BookRepository bookRepository;
    private final BookCopyRepository bookCopyRepository;
    private final CategoryRepository categoryRepository;
    private final AuthorRepository authorRepository;

    private static final int MAX_STRING_LENGTH = 255;
    private static final int COPIES_PER_BOOK = 3;

    @CacheEvict(value = "book", allEntries = true)
    public SeedImportResponse importBooks(List<BookSeedDto> books) {
        int imported = 0;
        int skipped = 0;
        Set<String> newCategories = new HashSet<>();

        for (BookSeedDto dto : books) {
            try {
                imported += importOne(dto, newCategories) ? 1 : 0;
            } catch (Exception e) {
                skipped++;
                log.warn("Skipped book '{}': {}", dto.getTitle(), e.getMessage());
            }
        }

        log.info("Seed import complete: {} imported, {} skipped, {} new categories created",
                imported, skipped, newCategories.size());
        return new SeedImportResponse(imported, skipped, newCategories.size());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean importOne(BookSeedDto dto, Set<String> newCategories) {
        String title = truncate(dto.getTitle().strip());
        String author = truncate(dto.getAuthor().strip());

        String isbn = dto.getIsbn();
        if (isbn != null && isbn.isBlank()) {
            isbn = null;
        }

        Book existingBook = findExistingBook(isbn, title, author).orElse(null);
        if (existingBook != null) {
            backfillMissingMetadata(existingBook, dto);
            log.warn("Duplicate seed book '{}' (isbn: {}), skipping create", title, isbn);
            return false;
        }

        Set<Category> categories = new HashSet<>();
        if (dto.getCategories() != null) {
            for (String catName : dto.getCategories()) {
                Category cat = categoryRepository.findByName(catName)
                        .orElseGet(() -> {
                            Category newCat = Category.builder().name(catName).build();
                            categoryRepository.save(newCat);
                            newCategories.add(catName);
                            return newCat;
                        });
                categories.add(cat);
            }
        }

        Book book = Book.builder()
                .title(title)
                .isbn(isbn)
                .publisher(truncate(dto.getPublisher()))
                .publishYear(dto.getPublishYear())
                .description(dto.getDescription())
                .coverImageUrl(dto.getCoverImageUrl())
                .categories(categories)
                .build();

        if (author != null && !author.isBlank()) {
            Set<Author> authors = new HashSet<>();
            String[] authorNames = author.split(",");
            for (String name : authorNames) {
                String trimmedName = name.trim();
                if (!trimmedName.isEmpty()) {
                    Author auth = authorRepository.findByName(trimmedName)
                            .orElseGet(() -> authorRepository.save(Author.builder().name(trimmedName).build()));
                    authors.add(auth);
                }
            }
            book.setAuthors(authors);
        }

        book = bookRepository.save(book);

        for (int i = 1; i <= COPIES_PER_BOOK; i++) {
            BookCopy copy = BookCopy.builder()
                    .book(book)
                    .copyNumber(i)
                    .status(CopyStatus.AVAILABLE)
                    .build();
            bookCopyRepository.save(copy);
        }
        return true;
    }

    private Optional<Book> findExistingBook(String isbn, String title, String author) {
        if (isbn != null) {
            return bookRepository.findByIsbn(isbn);
        }

        Set<String> seedAuthors = normalizeAuthorNames(author);
        if (seedAuthors.isEmpty()) {
            return Optional.empty();
        }

        return bookRepository.findByIsbnIsNullAndTitleIgnoreCase(title).stream()
                .filter(book -> normalizeAuthorNames(book.getAuthors()).equals(seedAuthors))
                .findFirst();
    }

    private Set<String> normalizeAuthorNames(Set<Author> authors) {
        if (authors == null) {
            return Set.of();
        }

        return authors.stream()
                .map(Author::getName)
                .map(this::normalizeKey)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toSet());
    }

    private Set<String> normalizeAuthorNames(String author) {
        if (author == null || author.isBlank()) {
            return Set.of();
        }

        return List.of(author.split(",")).stream()
                .map(this::normalizeKey)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toSet());
    }

    private void backfillMissingMetadata(Book book, BookSeedDto dto) {
        boolean changed = false;

        if (isBlank(book.getCoverImageUrl()) && !isBlank(dto.getCoverImageUrl())) {
            book.setCoverImageUrl(dto.getCoverImageUrl());
            changed = true;
        }

        if (book.getPublishYear() == null && dto.getPublishYear() != null) {
            book.setPublishYear(dto.getPublishYear());
            changed = true;
        }

        if (isBlank(book.getPublisher()) && !isBlank(dto.getPublisher())) {
            book.setPublisher(truncate(dto.getPublisher()));
            changed = true;
        }

        if (isBlank(book.getDescription()) && !isBlank(dto.getDescription())) {
            book.setDescription(dto.getDescription());
            changed = true;
        }

        if (changed) {
            bookRepository.save(book);
        }
    }

    private String truncate(String value) {
        if (value == null) return null;
        return value.length() <= MAX_STRING_LENGTH ? value : value.substring(0, MAX_STRING_LENGTH);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String normalizeKey(String value) {
        if (value == null) {
            return "";
        }
        return value.strip().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }
}
