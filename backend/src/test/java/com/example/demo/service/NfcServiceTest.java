package com.example.demo.service;

import com.example.demo.dto.request.NfcRegisterBookCopyRequest;
import com.example.demo.dto.request.NfcRegisterUserRequest;
import com.example.demo.dto.response.*;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.BookCopyMapper;
import com.example.demo.mapper.UserMapper;
import com.example.demo.model.entity.BookCopy;
import com.example.demo.model.entity.User;
import com.example.demo.model.enums.CopyStatus;
import com.example.demo.model.enums.Role;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NfcServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private BookCopyRepository bookCopyRepository;
    @Mock private UserMapper userMapper;
    @Mock private BookCopyMapper bookCopyMapper;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks private NfcService nfcService;

    private User testUser;
    private UserResponse testUserResponse;
    private BookCopy testBookCopy;
    private BookCopyResponse testBookCopyResponse;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .username("student01")
                .email("student@test.com")
                .fullName("Nguyễn Văn A")
                .studentId("20200001")
                .role(Role.STUDENT)
                .isActive(true)
                .build();

        testUserResponse = UserResponse.builder()
                .id(1L)
                .username("student01")
                .email("student@test.com")
                .fullName("Nguyễn Văn A")
                .studentId("20200001")
                .role("STUDENT")
                .isActive(true)
                .build();

        testBookCopy = BookCopy.builder()
                .id(45L)
                .copyNumber(1)
                .status(CopyStatus.AVAILABLE)
                .build();

        testBookCopyResponse = BookCopyResponse.builder()
                .id(45L)
                .bookId(12L)
                .copyNumber(1)
                .status("AVAILABLE")
                .build();
    }

    @Nested
    @DisplayName("scanNfc Tests")
    class ScanNfcTests {

        @Test
        @DisplayName("should identify USER when UID belongs to a user")
        void scanNfc_identifyUser() {
            String uid = "04:A2:B3:C4";
            when(userRepository.findByNfcCardUid(uid)).thenReturn(Optional.of(testUser));
            when(userMapper.toResponse(testUser)).thenReturn(testUserResponse);

            NfcScanResponse response = nfcService.scanNfc(uid);

            assertThat(response.getType()).isEqualTo("USER");
            assertThat(response.getData()).isInstanceOf(UserResponse.class);
            UserResponse data = (UserResponse) response.getData();
            assertThat(data.getFullName()).isEqualTo("Nguyễn Văn A");

            verify(userRepository).findByNfcCardUid(uid);
            verify(bookCopyRepository, never()).findByNfcTagUid(any());
        }

        @Test
        @DisplayName("should identify BOOK_COPY when UID belongs to a book copy")
        void scanNfc_identifyBookCopy() {
            String uid = "AA:BB:CC:DD";
            when(userRepository.findByNfcCardUid(uid)).thenReturn(Optional.empty());
            when(bookCopyRepository.findByNfcTagUid(uid)).thenReturn(Optional.of(testBookCopy));
            when(bookCopyMapper.toResponse(testBookCopy)).thenReturn(testBookCopyResponse);

            NfcScanResponse response = nfcService.scanNfc(uid);

            assertThat(response.getType()).isEqualTo("BOOK_COPY");
            assertThat(response.getData()).isInstanceOf(BookCopyResponse.class);
            BookCopyResponse data = (BookCopyResponse) response.getData();
            assertThat(data.getId()).isEqualTo(45L);

            verify(userRepository).findByNfcCardUid(uid);
            verify(bookCopyRepository).findByNfcTagUid(uid);
        }

        @Test
        @DisplayName("should return UNKNOWN when UID is not registered")
        void scanNfc_unknownUid() {
            String uid = "EE:FF:11:22";
            when(userRepository.findByNfcCardUid(uid)).thenReturn(Optional.empty());
            when(bookCopyRepository.findByNfcTagUid(uid)).thenReturn(Optional.empty());

            NfcScanResponse response = nfcService.scanNfc(uid);

            assertThat(response.getType()).isEqualTo("UNKNOWN");
            assertThat(response.getData()).isInstanceOf(NfcUnknownResponse.class);
            NfcUnknownResponse data = (NfcUnknownResponse) response.getData();
            assertThat(data.getUid()).isEqualTo("EE:FF:11:22");
        }

        @Test
        @DisplayName("should uppercase and trim UID before scanning")
        void scanNfc_shouldNormalizeUid() {
            String rawUid = "  ee:ff:11:22  ";
            String cleanUid = "EE:FF:11:22";

            when(userRepository.findByNfcCardUid(cleanUid)).thenReturn(Optional.empty());
            when(bookCopyRepository.findByNfcTagUid(cleanUid)).thenReturn(Optional.empty());

            NfcScanResponse response = nfcService.scanNfc(rawUid);

            assertThat(response.getType()).isEqualTo("UNKNOWN");
            NfcUnknownResponse data = (NfcUnknownResponse) response.getData();
            assertThat(data.getUid()).isEqualTo(cleanUid);
        }
    }

    @Nested
    @DisplayName("registerUser Tests")
    class RegisterUserTests {

        @Test
        @DisplayName("should register NFC card UID to user successfully")
        void registerUser_success() {
            NfcRegisterUserRequest request = new NfcRegisterUserRequest(1L, "04:A2:B3:C4");

            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.findByNfcCardUid("04:A2:B3:C4")).thenReturn(Optional.empty());
            when(bookCopyRepository.findByNfcTagUid("04:A2:B3:C4")).thenReturn(Optional.empty());
            when(userRepository.save(any(User.class))).thenReturn(testUser);
            when(userMapper.toResponse(any(User.class))).thenReturn(testUserResponse);

            UserResponse result = nfcService.registerUser(request);

            assertThat(result).isNotNull();
            verify(userRepository).save(testUser);
            assertThat(testUser.getNfcCardUid()).isEqualTo("04:A2:B3:C4");
        }

        @Test
        @DisplayName("should be idempotent if card is already registered to this user")
        void registerUser_idempotent() {
            testUser.setNfcCardUid("04:A2:B3:C4");
            NfcRegisterUserRequest request = new NfcRegisterUserRequest(1L, "04:A2:B3:C4");

            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userMapper.toResponse(testUser)).thenReturn(testUserResponse);

            UserResponse result = nfcService.registerUser(request);

            assertThat(result).isNotNull();
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("should throw error if user not found")
        void registerUser_userNotFound() {
            NfcRegisterUserRequest request = new NfcRegisterUserRequest(99L, "04:A2:B3:C4");
            when(userRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> nfcService.registerUser(request))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("should throw error if UID is already registered to another user")
        void registerUser_duplicateUserUid() {
            NfcRegisterUserRequest request = new NfcRegisterUserRequest(1L, "04:A2:B3:C4");

            User anotherUser = User.builder().id(2L).fullName("Another").nfcCardUid("04:A2:B3:C4").build();

            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.findByNfcCardUid("04:A2:B3:C4")).thenReturn(Optional.of(anotherUser));

            assertThatThrownBy(() -> nfcService.registerUser(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already bound to user");
        }

        @Test
        @DisplayName("should throw error if UID is already registered to a book copy")
        void registerUser_duplicateBookCopyUid() {
            NfcRegisterUserRequest request = new NfcRegisterUserRequest(1L, "04:A2:B3:C4");

            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.findByNfcCardUid("04:A2:B3:C4")).thenReturn(Optional.empty());
            when(bookCopyRepository.findByNfcTagUid("04:A2:B3:C4")).thenReturn(Optional.of(testBookCopy));

            assertThatThrownBy(() -> nfcService.registerUser(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already bound to book copy ID");
        }
    }

    @Nested
    @DisplayName("registerBookCopy Tests")
    class RegisterBookCopyTests {

        @Test
        @DisplayName("should register NFC tag UID to book copy successfully")
        void registerBookCopy_success() {
            NfcRegisterBookCopyRequest request = new NfcRegisterBookCopyRequest(45L, "AA:BB:CC:DD");

            when(bookCopyRepository.findById(45L)).thenReturn(Optional.of(testBookCopy));
            when(userRepository.findByNfcCardUid("AA:BB:CC:DD")).thenReturn(Optional.empty());
            when(bookCopyRepository.findByNfcTagUid("AA:BB:CC:DD")).thenReturn(Optional.empty());
            when(bookCopyRepository.save(any(BookCopy.class))).thenReturn(testBookCopy);
            when(bookCopyMapper.toResponse(any(BookCopy.class))).thenReturn(testBookCopyResponse);

            BookCopyResponse result = nfcService.registerBookCopy(request);

            assertThat(result).isNotNull();
            verify(bookCopyRepository).save(testBookCopy);
            assertThat(testBookCopy.getNfcTagUid()).isEqualTo("AA:BB:CC:DD");
        }

        @Test
        @DisplayName("should be idempotent if tag is already registered to this book copy")
        void registerBookCopy_idempotent() {
            testBookCopy.setNfcTagUid("AA:BB:CC:DD");
            NfcRegisterBookCopyRequest request = new NfcRegisterBookCopyRequest(45L, "AA:BB:CC:DD");

            when(bookCopyRepository.findById(45L)).thenReturn(Optional.of(testBookCopy));
            when(bookCopyMapper.toResponse(testBookCopy)).thenReturn(testBookCopyResponse);

            BookCopyResponse result = nfcService.registerBookCopy(request);

            assertThat(result).isNotNull();
            verify(bookCopyRepository, never()).save(any());
        }

        @Test
        @DisplayName("should throw error if book copy not found")
        void registerBookCopy_notFound() {
            NfcRegisterBookCopyRequest request = new NfcRegisterBookCopyRequest(999L, "AA:BB:CC:DD");
            when(bookCopyRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> nfcService.registerBookCopy(request))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("should throw error if UID is already registered to a user")
        void registerBookCopy_duplicateUserUid() {
            NfcRegisterBookCopyRequest request = new NfcRegisterBookCopyRequest(45L, "AA:BB:CC:DD");

            when(bookCopyRepository.findById(45L)).thenReturn(Optional.of(testBookCopy));
            when(userRepository.findByNfcCardUid("AA:BB:CC:DD")).thenReturn(Optional.of(testUser));

            assertThatThrownBy(() -> nfcService.registerBookCopy(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already bound to user");
        }

        @Test
        @DisplayName("should throw error if UID is already registered to another book copy")
        void registerBookCopy_duplicateBookCopyUid() {
            NfcRegisterBookCopyRequest request = new NfcRegisterBookCopyRequest(45L, "AA:BB:CC:DD");

            BookCopy anotherCopy = BookCopy.builder().id(46L).nfcTagUid("AA:BB:CC:DD").build();

            when(bookCopyRepository.findById(45L)).thenReturn(Optional.of(testBookCopy));
            when(userRepository.findByNfcCardUid("AA:BB:CC:DD")).thenReturn(Optional.empty());
            when(bookCopyRepository.findByNfcTagUid("AA:BB:CC:DD")).thenReturn(Optional.of(anotherCopy));

            assertThatThrownBy(() -> nfcService.registerBookCopy(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already bound to book copy ID");
        }
    }
}
