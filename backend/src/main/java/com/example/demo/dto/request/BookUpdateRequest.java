package com.example.demo.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
public class BookUpdateRequest {

    @Size(max = 255)
    private String title;

    @Size(max = 255)
    private String author;

    @Size(max = 20)
    private String isbn;

    @Size(max = 255)
    private String publisher;

    private Integer publishYear;

    private String description;

    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    @Size(max = 500)
    private String coverImageUrl;

    private Set<Long> categoryIds;
}
