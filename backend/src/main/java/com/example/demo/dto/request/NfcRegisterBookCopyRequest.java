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
public class NfcRegisterBookCopyRequest {

    @NotNull(message = "Book Copy ID is required")
    private Long copyId;

    @NotBlank(message = "NFC tag UID is required")
    private String nfcTagUid;
}
