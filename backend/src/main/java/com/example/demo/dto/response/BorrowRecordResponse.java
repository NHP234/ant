package com.example.demo.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class BorrowRecordResponse {

    private Long id;
    private Long userId;
    private String userFullName;
    private Long bookId;
    private String bookTitle;
    private String bookAuthor;
    private LocalDateTime borrowDate;
    private LocalDateTime dueDate;
    private LocalDateTime returnDate;
    private String status;
    private String note;
    private LocalDateTime createdAt;
}
