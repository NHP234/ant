package com.example.demo.dto.response;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ChatResponseTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void shouldMapRagSnakeCaseSourcesToCamelCaseDto() throws Exception {
        String json = """
                {
                  "answer": "Found books",
                  "intent": "BOOK_SEARCH",
                  "confidence": 0.91,
                  "source_books": [
                    {
                      "book_id": 42,
                      "title": "Clean Code",
                      "author": "Robert C. Martin",
                      "relevance_score": 0.88
                    }
                  ]
                }
                """;

        ChatResponse response = objectMapper.readValue(json, ChatResponse.class);

        assertThat(response.getSourceBooks()).hasSize(1);
        ChatResponse.SourceBook source = response.getSourceBooks().getFirst();
        assertThat(source.getBookId()).isEqualTo(42L);
        assertThat(source.getTitle()).isEqualTo("Clean Code");
        assertThat(source.getAuthor()).isEqualTo("Robert C. Martin");
        assertThat(source.getRelevanceScore()).isEqualTo(0.88);
    }
}
