package com.example.demo.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HoldResponse {

    private Long id;
    private Long userId;
    private String userFullName;
    private Long bookId;
    private String bookTitle;
    private String bookAuthor;
    private String bookCoverImageUrl;
    private Long copyId;
    private Integer copyNumber;
    private String status;
    private LocalDateTime reservedAt;
    private LocalDateTime expiresAt;
    private LocalDateTime fulfilledAt;
    private LocalDateTime canceledAt;
    private String cancelReason;
    private String librarianName;
    private LocalDateTime createdAt;
}
