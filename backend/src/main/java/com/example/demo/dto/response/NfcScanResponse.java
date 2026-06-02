package com.example.demo.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NfcScanResponse {

    private String type; // USER, BOOK_COPY, UNKNOWN
    private Object data; // UserResponse, BookCopyResponse, or NfcUnknownResponse
}
