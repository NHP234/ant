package com.example.demo.exception;

public class HoldExpiredException extends RuntimeException {

    public HoldExpiredException(Long holdId) {
        super(String.format("Hold with id %d has expired", holdId));
    }
}
