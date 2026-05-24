package com.example.demo.dto.request;

import jakarta.validation.Valid;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class SeedImportRequest {
    @Valid
    private List<BookSeedDto> books;
}
