package com.example.demo.dto.response;

import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Set;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookResponse implements Serializable {

    private Long id;
    private String title;
    private String author;
    private String isbn;
    private String publisher;
    private Integer publishYear;
    private String description;
    private Integer totalCopies;
    private Integer availableCopies;
    private String coverImageUrl;
    private Set<CategoryResponse> categories;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
