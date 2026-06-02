package com.example.demo.dto.request;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BookSeedDtoTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void shouldDeserializeSnakeCaseSeedFields() throws Exception {
        String json = """
                {
                  "title": "Seed Book",
                  "author": "Seed Author",
                  "publish_year": 2020,
                  "cover_image_url": "https://example.com/cover.jpg"
                }
                """;

        BookSeedDto dto = objectMapper.readValue(json, BookSeedDto.class);

        assertEquals(2020, dto.getPublishYear());
        assertEquals("https://example.com/cover.jpg", dto.getCoverImageUrl());
    }
}
