package com.example.demo.mapper;

import com.example.demo.dto.response.AuthorResponse;
import com.example.demo.model.entity.Author;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AuthorMapper {
    AuthorResponse toResponse(Author author);
}
