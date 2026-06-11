package com.example.demo.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.example.demo.model.enums.BorrowSource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class BorrowSlipCreateRequest {

    private String username;

    private String studentId;

    private BorrowSource source;

    @Valid
    @NotEmpty(message = "At least one borrow item is required")
    private List<BorrowItemRequest> items;

    @JsonIgnore
    @AssertTrue(message = "Exactly one of username or studentId is required")
    public boolean isBorrowerIdentifierValid() {
        boolean hasUsername = username != null && !username.isBlank();
        boolean hasStudentId = studentId != null && !studentId.isBlank();
        return hasUsername != hasStudentId;
    }
}
