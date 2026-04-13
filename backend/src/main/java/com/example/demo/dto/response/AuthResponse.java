package com.example.demo.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthResponse {

    private String accessToken;
    private String refreshToken;

    @Builder.Default
    private String tokenType = "Bearer";

    private long expiresIn;
    private UserInfo user;

    @Getter
    @Builder
    public static class UserInfo {
        private Long id;
        private String username;
        private String email;
        private String fullName;
        private String role;
    }
}
