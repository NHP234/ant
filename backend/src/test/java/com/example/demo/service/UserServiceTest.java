package com.example.demo.service;

import com.example.demo.dto.request.CreateUserRequest;
import com.example.demo.dto.response.UserResponse;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.UserMapper;
import com.example.demo.model.entity.User;
import com.example.demo.model.enums.Role;
import com.example.demo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private UserMapper userMapper;

    @InjectMocks private UserService userService;

    private User testUser;
    private UserResponse testUserResponse;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L).username("librarian01").email("lib@test.com")
                .fullName("Test Librarian").role(Role.LIBRARIAN).isActive(true).build();

        testUserResponse = UserResponse.builder()
                .id(1L).username("librarian01").email("lib@test.com")
                .fullName("Test Librarian").role("LIBRARIAN").isActive(true).build();
    }

    @Nested
    @DisplayName("createUser")
    class CreateUser {

        @Test
        @DisplayName("should create user successfully")
        void createUser_success() {
            CreateUserRequest request = new CreateUserRequest();
            request.setUsername("librarian01");
            request.setPassword("Lib@1234");
            request.setEmail("lib@test.com");
            request.setFullName("Test Librarian");
            request.setRole("LIBRARIAN");

            when(userRepository.existsByUsername("librarian01")).thenReturn(false);
            when(userRepository.existsByEmail("lib@test.com")).thenReturn(false);
            when(passwordEncoder.encode("Lib@1234")).thenReturn("$2a$10$encoded");
            when(userRepository.save(any(User.class))).thenReturn(testUser);
            when(userMapper.toResponse(testUser)).thenReturn(testUserResponse);

            UserResponse result = userService.createUser(request);

            assertThat(result.getUsername()).isEqualTo("librarian01");
            assertThat(result.getRole()).isEqualTo("LIBRARIAN");
            verify(passwordEncoder).encode("Lib@1234");
        }

        @Test
        @DisplayName("should throw when username already exists")
        void createUser_duplicateUsername() {
            CreateUserRequest request = new CreateUserRequest();
            request.setUsername("existing");
            request.setEmail("new@test.com");
            request.setRole("STUDENT");

            when(userRepository.existsByUsername("existing")).thenReturn(true);

            assertThatThrownBy(() -> userService.createUser(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Username already exists");
        }

        @Test
        @DisplayName("should throw when email already exists")
        void createUser_duplicateEmail() {
            CreateUserRequest request = new CreateUserRequest();
            request.setUsername("newuser");
            request.setEmail("existing@test.com");
            request.setRole("STUDENT");

            when(userRepository.existsByUsername("newuser")).thenReturn(false);
            when(userRepository.existsByEmail("existing@test.com")).thenReturn(true);

            assertThatThrownBy(() -> userService.createUser(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Email already exists");
        }

        @Test
        @DisplayName("should throw when role is invalid")
        void createUser_invalidRole() {
            CreateUserRequest request = new CreateUserRequest();
            request.setUsername("newuser");
            request.setEmail("new@test.com");
            request.setFullName("Test");
            request.setPassword("Pass123");
            request.setRole("SUPERADMIN");

            when(userRepository.existsByUsername("newuser")).thenReturn(false);
            when(userRepository.existsByEmail("new@test.com")).thenReturn(false);

            assertThatThrownBy(() -> userService.createUser(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Invalid role");
        }
    }

    @Nested
    @DisplayName("updateRole")
    class UpdateRole {

        @Test
        @DisplayName("should update role successfully")
        void updateRole_success() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenReturn(testUser);
            when(userMapper.toResponse(any())).thenReturn(testUserResponse);

            UserResponse result = userService.updateRole(1L, "ADMIN");

            assertThat(result).isNotNull();
            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("should throw when user not found")
        void updateRole_userNotFound() {
            when(userRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.updateRole(99L, "ADMIN"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("updateStatus")
    class UpdateStatus {

        @Test
        @DisplayName("should deactivate user")
        void updateStatus_deactivate() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenReturn(testUser);
            when(userMapper.toResponse(any())).thenReturn(
                    UserResponse.builder().id(1L).isActive(false).build());

            UserResponse result = userService.updateStatus(1L, false);

            assertThat(result.getIsActive()).isFalse();
        }

        @Test
        @DisplayName("should activate user")
        void updateStatus_activate() {
            testUser.setIsActive(false);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenReturn(testUser);
            when(userMapper.toResponse(any())).thenReturn(
                    UserResponse.builder().id(1L).isActive(true).build());

            UserResponse result = userService.updateStatus(1L, true);

            assertThat(result.getIsActive()).isTrue();
        }
    }

    @Nested
    @DisplayName("getMyProfile")
    class GetMyProfile {

        @Test
        @DisplayName("should return profile for existing user")
        void getMyProfile_success() {
            when(userRepository.findByUsername("librarian01")).thenReturn(Optional.of(testUser));
            when(userMapper.toResponse(testUser)).thenReturn(testUserResponse);

            UserResponse result = userService.getMyProfile("librarian01");

            assertThat(result.getUsername()).isEqualTo("librarian01");
        }

        @Test
        @DisplayName("should throw when user not found")
        void getMyProfile_notFound() {
            when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.getMyProfile("ghost"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }
}
