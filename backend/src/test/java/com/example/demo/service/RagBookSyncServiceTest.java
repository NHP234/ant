package com.example.demo.service;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class RagBookSyncServiceTest {

    private RagBookSyncService ragBookSyncService;
    private HttpServer server;
    private List<CapturedRequest> requests;

    @BeforeEach
    void setUp() throws IOException {
        ragBookSyncService = new RagBookSyncService();
        requests = new ArrayList<>();
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/", this::captureRequest);
        server.start();

        ReflectionTestUtils.setField(ragBookSyncService, "ragServiceUrl", baseUrl() + "///");
        ReflectionTestUtils.setField(ragBookSyncService, "internalApiKey", "test-internal-key");
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void upsertBookPostsToRagIngestEndpointWithInternalKey() {
        ragBookSyncService.upsertBook(42L);

        assertThat(requests).hasSize(1);
        CapturedRequest request = requests.getFirst();
        assertThat(request.method()).isEqualTo("POST");
        assertThat(request.path()).isEqualTo("/api/ingest/books/42");
        assertThat(request.internalKey()).isEqualTo("test-internal-key");
    }

    @Test
    void deleteBookCallsRagDeleteEndpointWithInternalKey() {
        ragBookSyncService.deleteBook(42L);

        assertThat(requests).hasSize(1);
        CapturedRequest request = requests.getFirst();
        assertThat(request.method()).isEqualTo("DELETE");
        assertThat(request.path()).isEqualTo("/api/ingest/books/42");
        assertThat(request.internalKey()).isEqualTo("test-internal-key");
    }

    @Test
    void syncFailureIsNonCritical() {
        server.stop(0);

        assertThatCode(() -> ragBookSyncService.upsertBook(42L)).doesNotThrowAnyException();
        assertThatCode(() -> ragBookSyncService.deleteBook(42L)).doesNotThrowAnyException();
    }

    private void captureRequest(HttpExchange exchange) throws IOException {
        requests.add(new CapturedRequest(
                exchange.getRequestMethod(),
                exchange.getRequestURI().getPath(),
                exchange.getRequestHeaders().getFirst("X-Internal-Key")));
        exchange.sendResponseHeaders(204, -1);
        exchange.close();
    }

    private String baseUrl() {
        return "http://localhost:" + server.getAddress().getPort();
    }

    private record CapturedRequest(String method, String path, String internalKey) {
    }
}
