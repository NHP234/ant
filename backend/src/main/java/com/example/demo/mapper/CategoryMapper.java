package com.example.demo.mapper;

import com.example.demo.dto.request.CategoryCreateRequest;
import com.example.demo.dto.response.CategoryResponse;
import com.example.demo.model.entity.Category;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CategoryMapper {

    CategoryResponse toResponse(Category category);

    Category toEntity(CategoryCreateRequest request);

    void updateEntity(CategoryCreateRequest request, @MappingTarget Category category);
}
