package com.example.demo.controller;

import com.example.demo.exception.HoldExpiredException;
import com.example.demo.security.JwtAuthenticationFilter;
import com.example.demo.service.BookHoldService;
import com.example.demo.service.BorrowService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BookHoldController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(BookHoldControllerTest.MethodSecurityTestConfig.class)
class BookHoldControllerTest {

    @TestConfiguration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class MethodSecurityTestConfig {
    }

    @jakarta.annotation.Resource
    private MockMvc mockMvc;

    @MockitoBean
    private BookHoldService bookHoldService;

    @MockitoBean
    private BorrowService borrowService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @WithMockUser(username = "librarian", roles = "LIBRARIAN")
    void createHoldRejectsLibrarian() throws Exception {
        mockMvc.perform(post("/api/holds")
                        .principal(new TestingAuthenticationToken(
                                "librarian", null, "ROLE_LIBRARIAN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "bookId": 10 }
                                """))
                .andExpect(status().isForbidden());

        verify(bookHoldService, never()).createHold(any(), any());
    }

    @Test
    @WithMockUser(username = "librarian", roles = "LIBRARIAN")
    void confirmExpiredHoldReturnsSpecificErrorCode() throws Exception {
        when(borrowService.confirmHold(eq(30L), any(), eq("librarian")))
                .thenThrow(new HoldExpiredException(30L));

        mockMvc.perform(put("/api/holds/30/confirm")
                        .principal(new TestingAuthenticationToken(
                                "librarian", null, "ROLE_LIBRARIAN")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("HOLD_EXPIRED"));
    }
}
