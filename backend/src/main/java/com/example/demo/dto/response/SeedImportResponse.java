package com.example.demo.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class SeedImportResponse {
    private int imported;
    private int skipped;
    private int totalCategories;
}
