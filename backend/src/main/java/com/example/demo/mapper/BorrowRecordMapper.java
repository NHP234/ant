package com.example.demo.mapper;

import com.example.demo.dto.response.BorrowRecordResponse;
import com.example.demo.model.entity.BorrowRecord;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BorrowRecordMapper {

    @Mapping(source = "slip.user.id", target = "userId")
    @Mapping(source = "slip.user.fullName", target = "userFullName")
    @Mapping(source = "copy.book.id", target = "bookId")
    @Mapping(source = "copy.book.title", target = "bookTitle")
    @Mapping(target = "bookAuthor", expression = "java(mapAuthorsToString(borrowRecord.getCopy().getBook().getAuthors()))")
    @Mapping(source = "copy.book.coverImageUrl", target = "bookCoverImageUrl")
    @Mapping(source = "copy.id", target = "copyId")
    @Mapping(source = "copy.copyNumber", target = "copyNumber")
    @Mapping(source = "slip.borrowDate", target = "borrowDate")
    @Mapping(source = "slip.dueDate", target = "dueDate")
    BorrowRecordResponse toResponse(BorrowRecord borrowRecord);

    default String mapAuthorsToString(java.util.Set<com.example.demo.model.entity.Author> authors) {
        if (authors == null || authors.isEmpty()) {
            return "";
        }
        return authors.stream()
                .map(com.example.demo.model.entity.Author::getName)
                .collect(java.util.stream.Collectors.joining(", "));
    }
}
