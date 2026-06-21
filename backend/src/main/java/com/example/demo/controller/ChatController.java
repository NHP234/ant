package com.example.demo.controller;

import com.example.demo.dto.request.ChatRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.ChatResponse;
import com.example.demo.model.entity.Book;
import com.example.demo.repository.BookRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Tag(name = "Chat", description = "AI Chatbot - Trợ lý thư viện thông minh (RAG)")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    @Value("${app.rag.service-url:http://localhost:8000}")
    private String ragServiceUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();
    private final BookRepository bookRepository;

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Gửi tin nhắn hỏi đáp cho Trợ lý AI")
    public ResponseEntity<ApiResponse<ChatResponse>> chat(
            @Valid @RequestBody ChatRequest request,
            @RequestHeader("Authorization") String authHeader) {

        log.info("Nhận yêu cầu Chatbot AI: '{}'", request.getQuestion());

        try {
            // Tự serialize sang JSON String để đảm bảo truyền body chính xác
            String jsonRequest = objectMapper.writeValueAsString(request);

            // Thiết lập Headers cho request gửi sang Python
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", authHeader);

            HttpEntity<String> entity = new HttpEntity<>(jsonRequest, headers);

            // Forward request + JWT tới Python RAG service bằng RestTemplate
            ResponseEntity<ChatResponse> responseEntity = restTemplate.postForEntity(
                    ragServiceUrl + "/api/chat",
                    entity,
                    ChatResponse.class
            );

            ChatResponse response = responseEntity.getBody();
            enrichSourceBookCovers(response);

            return ResponseEntity.ok(ApiResponse.ok(response, "Thành công"));
        } catch (Exception e) {
            log.error("RAG Service không khả dụng: {}", e.getMessage());
            
            // Fallback khi RAG service chưa bật hoặc bị lỗi
            ChatResponse fallbackResponse = ChatResponse.builder()
                    .answer("Xin lỗi bạn, chatbot AI hiện đang bảo trì hoặc chưa sẵn sàng. Bạn có thể sử dụng chức năng tìm kiếm sách ở trang chủ thư viện nhé!")
                    .intent("UNKNOWN")
                    .confidence(0.0)
                    .build();
            
            return ResponseEntity.ok(ApiResponse.ok(fallbackResponse, "RAG service offline (Fallback applied)"));
        }
    }

    private void enrichSourceBookCovers(ChatResponse response) {
        if (response == null || response.getSourceBooks() == null || response.getSourceBooks().isEmpty()) {
            return;
        }

        var missingCoverIds = response.getSourceBooks().stream()
                .filter(source -> source.getBookId() != null)
                .filter(source -> source.getCoverImageUrl() == null || source.getCoverImageUrl().isBlank())
                .map(ChatResponse.SourceBook::getBookId)
                .distinct()
                .toList();

        if (missingCoverIds.isEmpty()) {
            return;
        }

        Map<Long, Book> booksById = bookRepository.findAllById(missingCoverIds).stream()
                .filter(book -> book.getCoverImageUrl() != null && !book.getCoverImageUrl().isBlank())
                .collect(Collectors.toMap(Book::getId, Function.identity()));

        response.getSourceBooks().forEach(source -> {
            if (source.getBookId() == null || source.getCoverImageUrl() != null && !source.getCoverImageUrl().isBlank()) {
                return;
            }
            Book book = booksById.get(source.getBookId());
            if (Objects.nonNull(book)) {
                source.setCoverImageUrl(book.getCoverImageUrl());
            }
        });
    }
}
