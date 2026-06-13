package com.example.demo.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NfcStudentResponse {

    private Long id;
    private String username;
    private String fullName;
    private String studentId;
    private Boolean isActive;
    private String nfcCardUid;
}
