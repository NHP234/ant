package com.example.demo.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class HoldCreateRequest {

    @NotNull(message = "Book ID is required")
    private Long bookId;
}
