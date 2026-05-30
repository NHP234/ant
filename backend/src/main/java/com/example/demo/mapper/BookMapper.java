package com.example.demo.mapper;

import com.example.demo.dto.request.BookCreateRequest;
import com.example.demo.dto.request.BookUpdateRequest;
import com.example.demo.dto.response.BookResponse;
import com.example.demo.model.entity.Book;
import org.mapstruct.*;

@Mapper(componentModel = "spring", uses = {CategoryMapper.class, AuthorMapper.class})
public interface BookMapper {

    @Mapping(target = "totalCopies", ignore = true)
    @Mapping(target = "availableCopies", ignore = true)
    @Mapping(target = "author", expression = "java(mapAuthorsToString(book.getAuthors()))")
    BookResponse toResponse(Book book);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "categories", ignore = true)
    @Mapping(target = "copies", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "authors", ignore = true)
    Book toEntity(BookCreateRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "categories", ignore = true)
    @Mapping(target = "copies", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "authors", ignore = true)
    void updateEntity(BookUpdateRequest request, @MappingTarget Book book);

    default String mapAuthorsToString(java.util.Set<com.example.demo.model.entity.Author> authors) {
        if (authors == null || authors.isEmpty()) {
            return "";
        }
        return authors.stream()
                .map(com.example.demo.model.entity.Author::getName)
                .collect(java.util.stream.Collectors.joining(", "));
    }
}
