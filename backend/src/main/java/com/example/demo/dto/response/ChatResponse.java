package com.example.demo.dto.response;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponse {

    private String answer;
    private String intent;
    private Double confidence;
    @JsonAlias("source_books")
    private List<SourceBook> sourceBooks;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SourceBook {
        @JsonAlias("book_id")
        private Long bookId;
        private String title;
        private String author;
        @JsonAlias("relevance_score")
        private Double relevanceScore;
    }
}
