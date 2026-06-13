package com.example.demo.controller;

import com.example.demo.dto.request.NfcRegisterBookCopyRequest;
import com.example.demo.dto.request.NfcRegisterUserRequest;
import com.example.demo.dto.request.NfcScanRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.BookCopyResponse;
import com.example.demo.dto.response.NfcScanResponse;
import com.example.demo.dto.response.NfcStudentResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.service.NfcService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/nfc")
@RequiredArgsConstructor
@Tag(name = "NFC Integration", description = "Các API tích hợp NFC, quét thẻ và stream SSE thời gian thực")
@Slf4j
public class NfcController {

    private final NfcService nfcService;

    @Value("${nfc.api-key:ant-library-nfc-secret-key-2026}")
    private String nfcApiKey;

    /**
     * Endpoint Server-Sent Events (SSE) để Frontend subscribe lắng nghe sự kiện quét thẻ NFC.
     * Endpoint này là public để Kiosk công cộng có thể dễ dàng kết nối mà không cần đăng nhập phức tạp.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Mở kết nối SSE Stream nhận sự kiện quẹt thẻ NFC thời gian thực (Public)")
    public ResponseEntity<SseEmitter> streamNfcEvents() {
        SseEmitter emitter = nfcService.registerEmitter();
        return ResponseEntity.ok(emitter);
    }

    /**
     * Endpoint nhận tín hiệu quét thẻ NFC từ ESP32.
     * Endpoint này public nhưng được bảo vệ bằng X-API-KEY tĩnh.
     */
    @PostMapping("/scan")
    @Operation(summary = "Gửi tín hiệu quét thẻ NFC từ ESP32 (Được bảo mật bằng API Key)")
    public ResponseEntity<ApiResponse<NfcScanResponse>> scanNfc(
            @RequestHeader(value = "X-API-KEY", required = false) String apiKey,
            @Valid @RequestBody NfcScanRequest request) {
        
        if (apiKey == null || !apiKey.equals(nfcApiKey)) {
            log.warn("Cảnh báo: Yêu cầu quét NFC bị từ chối do API Key không khớp hoặc thiếu.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        NfcScanResponse result = nfcService.scanNfc(request.getUid());
        return ResponseEntity.ok(ApiResponse.ok(result, "NFC tag scanned and broadcasted successfully"));
    }

    /**
     * API đăng ký thẻ NFC cho User sinh viên.
     * Yêu cầu quyền ADMIN hoặc LIBRARIAN.
     */
    @GetMapping("/students")
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    @Operation(summary = "Tìm sinh viên để cấp thẻ NFC (Yêu cầu Admin/Librarian)")
    public ResponseEntity<ApiResponse<PageResponse<NfcStudentResponse>>> searchStudents(
            @RequestParam(defaultValue = "") String query,
            @PageableDefault(size = 10, sort = "fullName", direction = Sort.Direction.ASC) Pageable pageable) {
        PageResponse<NfcStudentResponse> response = nfcService.searchStudents(query, pageable);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/register-user")
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    @Operation(summary = "Gán thẻ NFC cho tài khoản sinh viên (Yêu cầu Admin/Librarian)")
    public ResponseEntity<ApiResponse<NfcStudentResponse>> registerUser(
            @Valid @RequestBody NfcRegisterUserRequest request) {
        NfcStudentResponse response = nfcService.registerUser(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "NFC Card bound to user successfully"));
    }

    /**
     * API đăng ký thẻ NFC cho bản sao sách vật lý.
     * Yêu cầu quyền ADMIN hoặc LIBRARIAN.
     */
    @PostMapping("/register-book-copy")
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    @Operation(summary = "Gán thẻ NFC cho bản sao sách vật lý (Yêu cầu Admin/Librarian)")
    public ResponseEntity<ApiResponse<BookCopyResponse>> registerBookCopy(
            @Valid @RequestBody NfcRegisterBookCopyRequest request) {
        BookCopyResponse response = nfcService.registerBookCopy(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "NFC Tag bound to book copy successfully"));
    }
}
