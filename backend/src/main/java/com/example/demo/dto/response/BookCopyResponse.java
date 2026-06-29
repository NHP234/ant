package com.example.demo.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookCopyResponse {

    private Long id;
    private Long bookId;
    private Integer copyNumber;
    private String nfcTagUid;
    private String status;
    private String conditionNote;
    private String title;
    private String coverImageUrl;
    private LocalDateTime createdAt;
}
