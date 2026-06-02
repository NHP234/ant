package com.example.demo.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
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

    @JsonAlias("publish_year")
    private Integer publishYear;

    private String description;

    @JsonAlias("cover_image_url")
    private String coverImageUrl;

    private List<String> categories;
}
