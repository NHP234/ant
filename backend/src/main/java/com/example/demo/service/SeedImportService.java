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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

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

        if (isbn != null && bookRepository.findByIsbn(isbn).isPresent()) {
            log.warn("Duplicate ISBN '{}' for book '{}', skipping", isbn, title);
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

    private String truncate(String value) {
        if (value == null) return null;
        return value.length() <= MAX_STRING_LENGTH ? value : value.substring(0, MAX_STRING_LENGTH);
    }
}
