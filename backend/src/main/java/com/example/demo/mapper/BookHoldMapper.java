package com.example.demo.mapper;

import com.example.demo.dto.response.HoldResponse;
import com.example.demo.model.entity.BookHold;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BookHoldMapper {

    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "user.fullName", target = "userFullName")
    @Mapping(source = "copy.book.id", target = "bookId")
    @Mapping(source = "copy.book.title", target = "bookTitle")
    @Mapping(source = "copy.id", target = "copyId")
    @Mapping(source = "copy.copyNumber", target = "copyNumber")
    @Mapping(target = "status", expression = "java(hold.getStatus().name())")
    @Mapping(target = "librarianName", expression = "java(hold.getLibrarian() != null ? hold.getLibrarian().getFullName() : null)")
    HoldResponse toResponse(BookHold hold);
}
