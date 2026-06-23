package com.example.demo.controller;

import com.example.demo.dto.response.UserResponse;
import com.example.demo.security.JwtAuthenticationFilter;
import com.example.demo.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(UserControllerTest.MethodSecurityTestConfig.class)
class UserControllerTest {

    @TestConfiguration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class MethodSecurityTestConfig {
    }

    @jakarta.annotation.Resource
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void clearHoldBanAllowsAdmin() throws Exception {
        when(userService.clearHoldBan(10L)).thenReturn(UserResponse.builder()
                .id(10L)
                .username("student01")
                .role("STUDENT")
                .holdBanUntil(null)
                .build());

        mockMvc.perform(delete("/api/users/10/hold-ban"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(10))
                .andExpect(jsonPath("$.message").value("Hold ban cleared successfully"));

        verify(userService).clearHoldBan(10L);
    }

    @Test
    @WithMockUser(username = "librarian", roles = "LIBRARIAN")
    void clearHoldBanRejectsLibrarian() throws Exception {
        mockMvc.perform(delete("/api/users/10/hold-ban"))
                .andExpect(status().isForbidden());

        verify(userService, never()).clearHoldBan(10L);
    }
}
