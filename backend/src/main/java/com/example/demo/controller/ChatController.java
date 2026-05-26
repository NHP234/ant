package com.example.demo.controller;

import com.example.demo.dto.request.ChatRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.ChatResponse;
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
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

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

    @PostMapping
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
}
