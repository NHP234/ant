package com.example.demo.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BorrowSlipResponse {

    private Long id;
    private Long userId;
    private String userFullName;
    private String librarianName;
    private LocalDateTime borrowDate;
    private LocalDateTime dueDate;
    private String note;
    private String source;
    private List<BorrowRecordResponse> records;
    private LocalDateTime createdAt;
}
