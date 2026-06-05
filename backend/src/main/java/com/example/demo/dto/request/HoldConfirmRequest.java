package com.example.demo.dto.request;

import com.example.demo.model.enums.BorrowSource;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class HoldConfirmRequest {

    private Long copyId;

    private BorrowSource source;
}
