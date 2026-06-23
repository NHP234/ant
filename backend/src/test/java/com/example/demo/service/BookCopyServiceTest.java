package com.example.demo.service;

import com.example.demo.dto.response.BookCopyResponse;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.BookCopyMapper;
import com.example.demo.model.entity.Book;
import com.example.demo.model.entity.BookCopy;
import com.example.demo.model.enums.CopyStatus;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.BookRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookCopyServiceTest {

    @Mock private BookCopyRepository bookCopyRepository;
    @Mock private BookRepository bookRepository;
    @Mock private BookCopyMapper bookCopyMapper;

    @InjectMocks private BookCopyService bookCopyService;

    private Book book;
    private BookCopy copy;

    @BeforeEach
    void setUp() {
        book = Book.builder()
                .id(10L)
                .title("Clean Architecture")
                .build();
        copy = BookCopy.builder()
                .id(20L)
                .book(book)
                .copyNumber(1)
                .nfcTagUid("AA:BB")
                .status(CopyStatus.AVAILABLE)
                .build();
    }

    @Test
    void getCopiesReturnsMappedCopiesInCopyNumberOrder() {
        BookCopy secondCopy = BookCopy.builder()
                .id(21L)
                .book(book)
                .copyNumber(2)
                .status(CopyStatus.AVAILABLE)
                .build();
        BookCopyResponse firstResponse = BookCopyResponse.builder().id(20L).copyNumber(1).build();
        BookCopyResponse secondResponse = BookCopyResponse.builder().id(21L).copyNumber(2).build();

        when(bookCopyRepository.findByBookIdOrderByCopyNumber(10L)).thenReturn(List.of(copy, secondCopy));
        when(bookCopyMapper.toResponse(copy)).thenReturn(firstResponse);
        when(bookCopyMapper.toResponse(secondCopy)).thenReturn(secondResponse);

        List<BookCopyResponse> result = bookCopyService.getCopies(10L);

        assertThat(result).containsExactly(firstResponse, secondResponse);
    }

    @Nested
    @DisplayName("addCopy")
    class AddCopy {

        @Test
        void createsAvailableCopyWithNextCopyNumberAndTrimmedNfcTag() {
            when(bookRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(book));
            when(bookCopyRepository.findByNfcTagUid("AA:BB:CC")).thenReturn(Optional.empty());
            when(bookCopyRepository.findMaxCopyNumber(10L)).thenReturn(3);
            when(bookCopyRepository.save(any(BookCopy.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(bookCopyMapper.toResponse(any(BookCopy.class))).thenReturn(
                    BookCopyResponse.builder().bookId(10L).copyNumber(4).nfcTagUid("AA:BB:CC").status("AVAILABLE").build());

            BookCopyResponse result = bookCopyService.addCopy(10L, "  AA:BB:CC  ");

            ArgumentCaptor<BookCopy> captor = ArgumentCaptor.forClass(BookCopy.class);
            verify(bookCopyRepository).save(captor.capture());
            BookCopy savedCopy = captor.getValue();
            assertThat(savedCopy.getBook()).isEqualTo(book);
            assertThat(savedCopy.getCopyNumber()).isEqualTo(4);
            assertThat(savedCopy.getNfcTagUid()).isEqualTo("AA:BB:CC");
            assertThat(savedCopy.getStatus()).isEqualTo(CopyStatus.AVAILABLE);
            assertThat(result.getCopyNumber()).isEqualTo(4);
        }

        @Test
        void storesBlankNfcTagAsNull() {
            when(bookRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(book));
            when(bookCopyRepository.findMaxCopyNumber(10L)).thenReturn(null);
            when(bookCopyRepository.save(any(BookCopy.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(bookCopyMapper.toResponse(any(BookCopy.class))).thenReturn(BookCopyResponse.builder().copyNumber(1).build());

            bookCopyService.addCopy(10L, "   ");

            ArgumentCaptor<BookCopy> captor = ArgumentCaptor.forClass(BookCopy.class);
            verify(bookCopyRepository).save(captor.capture());
            assertThat(captor.getValue().getCopyNumber()).isEqualTo(1);
            assertThat(captor.getValue().getNfcTagUid()).isNull();
            verify(bookCopyRepository, never()).findByNfcTagUid(any());
        }

        @Test
        void rejectsDuplicateNfcTag() {
            when(bookRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(book));
            when(bookCopyRepository.findByNfcTagUid("AA:BB")).thenReturn(Optional.of(copy));

            assertThatThrownBy(() -> bookCopyService.addCopy(10L, "AA:BB"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("NFC tag is already assigned");

            verify(bookCopyRepository, never()).save(any());
        }

        @Test
        void throwsWhenBookNotFound() {
            when(bookRepository.findByIdForUpdate(404L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> bookCopyService.addCopy(404L, null))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("updateCopy")
    class UpdateCopy {

        @Test
        void updatesMutableCopyFields() {
            when(bookCopyRepository.findById(20L)).thenReturn(Optional.of(copy));
            when(bookCopyRepository.save(copy)).thenReturn(copy);
            when(bookCopyMapper.toResponse(copy)).thenReturn(
                    BookCopyResponse.builder().id(20L).status("DAMAGED").conditionNote("Missing cover").build());

            BookCopyResponse result = bookCopyService.updateCopy(10L, 20L, "CC:DD", "DAMAGED", "Missing cover");

            assertThat(copy.getNfcTagUid()).isEqualTo("CC:DD");
            assertThat(copy.getStatus()).isEqualTo(CopyStatus.DAMAGED);
            assertThat(copy.getConditionNote()).isEqualTo("Missing cover");
            assertThat(result.getStatus()).isEqualTo("DAMAGED");
        }

        @Test
        void rejectsCopyFromAnotherBook() {
            Book otherBook = Book.builder().id(99L).build();
            copy.setBook(otherBook);
            when(bookCopyRepository.findById(20L)).thenReturn(Optional.of(copy));

            assertThatThrownBy(() -> bookCopyService.updateCopy(10L, 20L, null, null, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Copy does not belong");

            verify(bookCopyRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("deleteCopy")
    class DeleteCopy {

        @Test
        void deletesAvailableCopy() {
            when(bookCopyRepository.findById(20L)).thenReturn(Optional.of(copy));

            bookCopyService.deleteCopy(10L, 20L);

            verify(bookCopyRepository).delete(copy);
        }

        @Test
        void rejectsBorrowedCopy() {
            copy.setStatus(CopyStatus.BORROWED);
            when(bookCopyRepository.findById(20L)).thenReturn(Optional.of(copy));

            assertThatThrownBy(() -> bookCopyService.deleteCopy(10L, 20L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("reserved or borrowed");

            verify(bookCopyRepository, never()).delete(any());
        }

        @Test
        void rejectsReservedCopy() {
            copy.setStatus(CopyStatus.RESERVED);
            when(bookCopyRepository.findById(20L)).thenReturn(Optional.of(copy));

            assertThatThrownBy(() -> bookCopyService.deleteCopy(10L, 20L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("reserved or borrowed");

            verify(bookCopyRepository, never()).delete(any());
        }
    }
}
