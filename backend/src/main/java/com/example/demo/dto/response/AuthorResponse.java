package com.example.demo.dto.response;

import lombok.*;

import java.io.Serializable;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthorResponse implements Serializable {
    private Long id;
    private String name;
}
