package com.example.demo.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class RagBookSyncService {

    @Value("${app.rag.service-url:http://localhost:8000}")
    private String ragServiceUrl;

    @Value("${app.rag.internal-key:SuperSecretInternalApiKey123!}")
    private String internalApiKey;

    @Async
    public void upsertBook(Long bookId) {
        try {
            RestClient.create()
                    .post()
                    .uri(endpoint("/api/ingest/books/{bookId}"), bookId)
                    .header("X-Internal-Key", internalApiKey)
                    .retrieve()
                    .toBodilessEntity();
            log.info("RAG book sync sent successfully for book {}.", bookId);
        } catch (Exception e) {
            log.warn("RAG book sync failed for book {} (non-critical): {}", bookId, e.getMessage());
        }
    }

    @Async
    public void deleteBook(Long bookId) {
        try {
            RestClient.create()
                    .delete()
                    .uri(endpoint("/api/ingest/books/{bookId}"), bookId)
                    .header("X-Internal-Key", internalApiKey)
                    .retrieve()
                    .toBodilessEntity();
            log.info("RAG book delete sent successfully for book {}.", bookId);
        } catch (Exception e) {
            log.warn("RAG book delete failed for book {} (non-critical): {}", bookId, e.getMessage());
        }
    }

    private String endpoint(String path) {
        return ragServiceUrl.replaceAll("/+$", "") + path;
    }
}
