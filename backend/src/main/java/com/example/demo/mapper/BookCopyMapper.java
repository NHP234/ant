package com.example.demo.mapper;

import com.example.demo.dto.response.BookCopyResponse;
import com.example.demo.model.entity.BookCopy;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BookCopyMapper {

    @Mapping(source = "book.id", target = "bookId")
    @Mapping(source = "book.title", target = "title")
    @Mapping(source = "book.coverImageUrl", target = "coverImageUrl")
    @Mapping(target = "status", expression = "java(bookCopy.getStatus().name())")
    BookCopyResponse toResponse(BookCopy bookCopy);
}
