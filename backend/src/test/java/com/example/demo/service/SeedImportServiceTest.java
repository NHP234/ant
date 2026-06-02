package com.example.demo.service;

import com.example.demo.dto.request.BookSeedDto;
import com.example.demo.model.entity.Author;
import com.example.demo.model.entity.Book;
import com.example.demo.model.entity.BookCopy;
import com.example.demo.repository.AuthorRepository;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.CategoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SeedImportServiceTest {

    @Mock private BookRepository bookRepository;
    @Mock private BookCopyRepository bookCopyRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private AuthorRepository authorRepository;

    @InjectMocks private SeedImportService seedImportService;

    @Test
    void shouldBackfillAndSkipNullIsbnDuplicateByTitleAndAuthor() {
        BookSeedDto dto = new BookSeedDto();
        dto.setTitle("Seed Book");
        dto.setAuthor(" seed   author ");
        dto.setCoverImageUrl("https://example.com/cover.jpg");
        dto.setPublishYear(2020);
        dto.setPublisher("Example Publisher");
        dto.setDescription("Updated description");

        Book existingBook = Book.builder()
                .id(1L)
                .title("seed book")
                .authors(Set.of(Author.builder().name("Seed Author").build()))
                .build();

        when(bookRepository.findByIsbnIsNullAndTitleIgnoreCase("Seed Book")).thenReturn(List.of(existingBook));

        boolean imported = seedImportService.importOne(dto, new HashSet<>());

        assertThat(imported).isFalse();
        assertThat(existingBook.getCoverImageUrl()).isEqualTo("https://example.com/cover.jpg");
        assertThat(existingBook.getPublishYear()).isEqualTo(2020);
        assertThat(existingBook.getPublisher()).isEqualTo("Example Publisher");
        assertThat(existingBook.getDescription()).isEqualTo("Updated description");
        verify(bookRepository).save(existingBook);
        verify(bookRepository, never()).findByIsbn(anyString());
        verify(bookCopyRepository, never()).save(any(BookCopy.class));
    }

    @Test
    void shouldCreateNullIsbnBookWhenTitleMatchesButAuthorDiffers() {
        BookSeedDto dto = new BookSeedDto();
        dto.setTitle("Seed Book");
        dto.setAuthor("New Author");

        Book existingBook = Book.builder()
                .id(1L)
                .title("Seed Book")
                .authors(Set.of(Author.builder().name("Different Author").build()))
                .build();

        when(bookRepository.findByIsbnIsNullAndTitleIgnoreCase("Seed Book")).thenReturn(List.of(existingBook));
        when(authorRepository.findByName("New Author")).thenReturn(Optional.empty());
        when(authorRepository.save(any(Author.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(bookRepository.save(any(Book.class))).thenAnswer(invocation -> invocation.getArgument(0));

        boolean imported = seedImportService.importOne(dto, new HashSet<>());

        assertThat(imported).isTrue();
        verify(bookRepository).save(any(Book.class));
        verify(bookCopyRepository, times(3)).save(any(BookCopy.class));
    }
}
