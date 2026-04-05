package com.example.demo.mapper;

import com.example.demo.dto.request.BookCreateRequest;
import com.example.demo.dto.request.BookUpdateRequest;
import com.example.demo.dto.response.BookResponse;
import com.example.demo.model.entity.Book;
import org.mapstruct.*;

@Mapper(componentModel = "spring", uses = {CategoryMapper.class})
public interface BookMapper {

    BookResponse toResponse(Book book);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "availableQuantity", source = "quantity")
    @Mapping(target = "categories", ignore = true)
    @Mapping(target = "nfcTagUid", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Book toEntity(BookCreateRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "quantity", ignore = true)
    @Mapping(target = "availableQuantity", ignore = true)
    @Mapping(target = "categories", ignore = true)
    @Mapping(target = "nfcTagUid", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(BookUpdateRequest request, @MappingTarget Book book);
}
