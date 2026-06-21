package com.example.demo.service;

import com.example.demo.dto.request.RegisterRequest;
import com.example.demo.model.entity.User;
import com.example.demo.model.enums.Role;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private AuthenticationManager authenticationManager;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                passwordEncoder,
                jwtTokenProvider,
                authenticationManager);
        ReflectionTestUtils.setField(authService, "accessTokenExpirationMs", 900_000L);
    }

    @Test
    void registerRejectsDuplicateStudentId() {
        RegisterRequest request = registerRequest();
        when(userRepository.existsByUsername("student01")).thenReturn(false);
        when(userRepository.existsByEmail("student01@test.local")).thenReturn(false);
        when(userRepository.existsByStudentId("20260001")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Student ID already exists");

        verify(userRepository, never()).save(any());
    }

    @Test
    void registerTrimsStudentFieldsAndCreatesStudent() {
        RegisterRequest request = registerRequest();
        request.setUsername(" student01 ");
        request.setEmail(" student01@test.local ");
        request.setFullName(" Student One ");
        request.setStudentId(" 20260001 ");

        when(userRepository.existsByUsername("student01")).thenReturn(false);
        when(userRepository.existsByEmail("student01@test.local")).thenReturn(false);
        when(userRepository.existsByStudentId("20260001")).thenReturn(false);
        when(passwordEncoder.encode("Pass@123")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtTokenProvider.generateAccessToken("student01", "STUDENT")).thenReturn("access");
        when(jwtTokenProvider.generateRefreshToken("student01")).thenReturn("refresh");

        authService.register(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User saved = userCaptor.getValue();
        assertThat(saved.getUsername()).isEqualTo("student01");
        assertThat(saved.getEmail()).isEqualTo("student01@test.local");
        assertThat(saved.getFullName()).isEqualTo("Student One");
        assertThat(saved.getStudentId()).isEqualTo("20260001");
        assertThat(saved.getRole()).isEqualTo(Role.STUDENT);
    }

    private RegisterRequest registerRequest() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("student01");
        request.setPassword("Pass@123");
        request.setEmail("student01@test.local");
        request.setFullName("Student One");
        request.setStudentId("20260001");
        return request;
    }
}
