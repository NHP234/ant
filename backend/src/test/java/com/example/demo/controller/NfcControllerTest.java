package com.example.demo.controller;

import com.example.demo.dto.response.NfcStudentResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.security.JwtAuthenticationFilter;
import com.example.demo.service.NfcService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NfcController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(NfcControllerTest.MethodSecurityTestConfig.class)
class NfcControllerTest {

    @TestConfiguration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class MethodSecurityTestConfig {
    }

    @jakarta.annotation.Resource
    private MockMvc mockMvc;

    @MockitoBean
    private NfcService nfcService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @WithMockUser(roles = "LIBRARIAN")
    void searchStudents_allowsLibrarian() throws Exception {
        NfcStudentResponse student = studentResponse(null);
        when(nfcService.searchStudents(eq("20201234"), any(Pageable.class)))
                .thenReturn(PageResponse.<NfcStudentResponse>builder()
                        .content(List.of(student))
                        .page(0)
                        .size(10)
                        .totalElements(1)
                        .totalPages(1)
                        .last(true)
                        .build());

        mockMvc.perform(get("/api/nfc/students")
                        .param("query", "20201234"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].studentId").value("20201234"))
                .andExpect(jsonPath("$.data.content[0].nfcCardUid").doesNotExist());
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void searchStudents_rejectsStudent() throws Exception {
        mockMvc.perform(get("/api/nfc/students"))
                .andExpect(status().isForbidden());

        verify(nfcService, never()).searchStudents(any(), any());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void registerUser_returnsNfcStudentResponse() throws Exception {
        when(nfcService.registerUser(any()))
                .thenReturn(studentResponse("66:3D:F3:06"));

        mockMvc.perform(post("/api/nfc/register-user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "userId": 12,
                                  "nfcCardUid": "66:3D:F3:06"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(12))
                .andExpect(jsonPath("$.data.nfcCardUid").value("66:3D:F3:06"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void registerUser_rejectsBlankUid() throws Exception {
        mockMvc.perform(post("/api/nfc/register-user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "userId": 12,
                                  "nfcCardUid": " "
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));

        verify(nfcService, never()).registerUser(any());
    }

    private NfcStudentResponse studentResponse(String nfcCardUid) {
        return NfcStudentResponse.builder()
                .id(12L)
                .username("student01")
                .fullName("Nguyen Van A")
                .studentId("20201234")
                .isActive(true)
                .nfcCardUid(nfcCardUid)
                .build();
    }
}
