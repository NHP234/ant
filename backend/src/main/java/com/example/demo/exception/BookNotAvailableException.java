package com.example.demo.exception;

public class BookNotAvailableException extends RuntimeException {

    public BookNotAvailableException(Long bookId) {
        super(String.format("Book with id %d is not available for borrowing", bookId));
    }
}
