package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NfcRegisterUserRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotBlank(message = "NFC card UID is required")
    private String nfcCardUid;
}
