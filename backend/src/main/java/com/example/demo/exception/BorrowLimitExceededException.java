package com.example.demo.exception;

public class BorrowLimitExceededException extends RuntimeException {

    public BorrowLimitExceededException(int maxBooks) {
        super(String.format("Borrow limit exceeded. Maximum allowed: %d books", maxBooks));
    }
}
