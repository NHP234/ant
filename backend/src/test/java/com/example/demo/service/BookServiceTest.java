package com.example.demo.service;

import com.example.demo.dto.request.BookCreateRequest;
import com.example.demo.dto.request.BookUpdateRequest;
import com.example.demo.dto.response.BookResponse;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.BookMapper;
import com.example.demo.model.entity.Book;
import com.example.demo.model.entity.Category;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.CategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookServiceTest {

    @Mock private BookRepository bookRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private BookMapper bookMapper;

    @InjectMocks private BookService bookService;

    private Book testBook;
    private BookResponse testBookResponse;

    @BeforeEach
    void setUp() {
        testBook = Book.builder()
                .id(1L).title("Clean Code").author("Robert Martin")
                .isbn("978-0132350884").quantity(3).availableQuantity(3).build();

        testBookResponse = BookResponse.builder()
                .id(1L).title("Clean Code").author("Robert Martin")
                .quantity(3).availableQuantity(3).build();
    }

    @Nested
    @DisplayName("getBookById")
    class GetBookById {

        @Test
        @DisplayName("should return book when found")
        void getBookById_success() {
            when(bookRepository.findById(1L)).thenReturn(Optional.of(testBook));
            when(bookMapper.toResponse(testBook)).thenReturn(testBookResponse);

            BookResponse result = bookService.getBookById(1L);

            assertThat(result.getTitle()).isEqualTo("Clean Code");
        }

        @Test
        @DisplayName("should throw when book not found")
        void getBookById_notFound() {
            when(bookRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> bookService.getBookById(99L))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("createBook")
    class CreateBook {

        @Test
        @DisplayName("should create book without categories")
        void createBook_noCategories() {
            BookCreateRequest request = new BookCreateRequest();
            request.setTitle("New Book");
            request.setAuthor("Author");
            request.setQuantity(2);

            when(bookMapper.toEntity(request)).thenReturn(testBook);
            when(bookRepository.save(any(Book.class))).thenReturn(testBook);
            when(bookMapper.toResponse(testBook)).thenReturn(testBookResponse);

            BookResponse result = bookService.createBook(request);

            assertThat(result.getId()).isEqualTo(1L);
            verify(bookRepository).save(any(Book.class));
        }

        @Test
        @DisplayName("should create book with categories")
        void createBook_withCategories() {
            BookCreateRequest request = new BookCreateRequest();
            request.setTitle("New Book");
            request.setAuthor("Author");
            request.setQuantity(2);
            request.setCategoryIds(Set.of(1L, 2L));

            Category cat1 = Category.builder().id(1L).name("CNTT").build();
            Category cat2 = Category.builder().id(2L).name("Khoa học").build();

            when(bookMapper.toEntity(request)).thenReturn(testBook);
            when(categoryRepository.findAllById(any())).thenReturn(List.of(cat1, cat2));
            when(bookRepository.save(any(Book.class))).thenReturn(testBook);
            when(bookMapper.toResponse(testBook)).thenReturn(testBookResponse);

            BookResponse result = bookService.createBook(request);

            assertThat(result).isNotNull();
            verify(categoryRepository).findAllById(any());
        }
    }

    @Nested
    @DisplayName("deleteBook")
    class DeleteBook {

        @Test
        @DisplayName("should delete book when found")
        void deleteBook_success() {
            when(bookRepository.findById(1L)).thenReturn(Optional.of(testBook));

            bookService.deleteBook(1L);

            verify(bookRepository).delete(testBook);
        }

        @Test
        @DisplayName("should throw when book not found")
        void deleteBook_notFound() {
            when(bookRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> bookService.deleteBook(99L))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("searchBooks")
    class SearchBooks {

        @Test
        @DisplayName("should return full-text search results")
        void searchBooks_fullText() {
            Pageable pageable = PageRequest.of(0, 20);
            Page<Book> page = new PageImpl<>(List.of(testBook), pageable, 1);

            when(bookRepository.fullTextSearch("clean", pageable)).thenReturn(page);
            when(bookMapper.toResponse(testBook)).thenReturn(testBookResponse);

            var result = bookService.searchBooks("clean", pageable);

            assertThat(result.getContent()).hasSize(1);
            verify(bookRepository, never()).findByTitleContainingIgnoreCase(any(), any());
        }

        @Test
        @DisplayName("should fallback to LIKE when full-text returns empty")
        void searchBooks_fallback() {
            Pageable pageable = PageRequest.of(0, 20);
            Page<Book> emptyPage = new PageImpl<>(List.of(), pageable, 0);
            Page<Book> likePage = new PageImpl<>(List.of(testBook), pageable, 1);

            when(bookRepository.fullTextSearch("test", pageable)).thenReturn(emptyPage);
            when(bookRepository.findByTitleContainingIgnoreCase("test", pageable)).thenReturn(likePage);
            when(bookMapper.toResponse(testBook)).thenReturn(testBookResponse);

            var result = bookService.searchBooks("test", pageable);

            assertThat(result.getContent()).hasSize(1);
            verify(bookRepository).findByTitleContainingIgnoreCase("test", pageable);
        }
    }
}
