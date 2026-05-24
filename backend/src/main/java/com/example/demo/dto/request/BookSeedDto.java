package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class BookSeedDto {

    @NotBlank
    private String title;

    @NotBlank
    private String author;

    private String isbn;

    private String publisher;

    private Integer publishYear;

    private String description;

    private String coverImageUrl;

    private List<String> categories;
}
