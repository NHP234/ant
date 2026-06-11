package com.example.demo.controller;

import com.example.demo.dto.response.BorrowSlipResponse;
import com.example.demo.security.JwtAuthenticationFilter;
import com.example.demo.service.BorrowService;
import com.example.demo.service.BorrowSlipService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BorrowSlipController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(BorrowSlipControllerTest.MethodSecurityTestConfig.class)
class BorrowSlipControllerTest {

    @TestConfiguration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class MethodSecurityTestConfig {
    }

    @jakarta.annotation.Resource
    private MockMvc mockMvc;

    @MockitoBean
    private BorrowService borrowService;

    @MockitoBean
    private BorrowSlipService borrowSlipService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void createBorrowSlip_allowsAdmin() throws Exception {
        when(borrowService.createBorrowSlip(eq("admin"), any()))
                .thenReturn(BorrowSlipResponse.builder().id(42L).build());

        mockMvc.perform(post("/api/borrow-slips")
                        .principal(new TestingAuthenticationToken("admin", null, "ROLE_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(42));
    }

    @Test
    @WithMockUser(username = "librarian", roles = "LIBRARIAN")
    void createBorrowSlip_allowsLibrarian() throws Exception {
        when(borrowService.createBorrowSlip(eq("librarian"), any()))
                .thenReturn(BorrowSlipResponse.builder().id(43L).build());

        mockMvc.perform(post("/api/borrow-slips")
                        .principal(new TestingAuthenticationToken("librarian", null, "ROLE_LIBRARIAN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(43));
    }

    @Test
    @WithMockUser(username = "student", roles = "STUDENT")
    void createBorrowSlip_rejectsStudent() throws Exception {
        mockMvc.perform(post("/api/borrow-slips")
                        .principal(new TestingAuthenticationToken("student", null, "ROLE_STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isForbidden());

        verify(borrowService, never()).createBorrowSlip(any(), any());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void createBorrowSlip_rejectsEmptyItems() throws Exception {
        mockMvc.perform(post("/api/borrow-slips")
                        .principal(new TestingAuthenticationToken("admin", null, "ROLE_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "studentId": "20201234",
                                  "source": "COUNTER",
                                  "items": []
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));

        verify(borrowService, never()).createBorrowSlip(any(), any());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void createBorrowSlip_rejectsMultipleBorrowerIdentifiers() throws Exception {
        mockMvc.perform(post("/api/borrow-slips")
                        .principal(new TestingAuthenticationToken("admin", null, "ROLE_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "student01",
                                  "studentId": "20201234",
                                  "source": "COUNTER",
                                  "items": [{ "bookId": 1 }]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));

        verify(borrowService, never()).createBorrowSlip(any(), any());
    }

    private String validRequest() {
        return """
                {
                  "studentId": "20201234",
                  "source": "COUNTER",
                  "items": [
                    { "bookId": 1, "copyId": 10 },
                    { "bookId": 2 }
                  ]
                }
                """;
    }
}
