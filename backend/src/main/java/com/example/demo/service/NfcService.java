package com.example.demo.service;

import com.example.demo.dto.request.NfcRegisterBookCopyRequest;
import com.example.demo.dto.request.NfcRegisterUserRequest;
import com.example.demo.dto.response.*;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.BookCopyMapper;
import com.example.demo.mapper.UserMapper;
import com.example.demo.model.entity.BookCopy;
import com.example.demo.model.entity.User;
import com.example.demo.model.enums.Role;
import com.example.demo.repository.BookCopyRepository;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class NfcService {

    private final UserRepository userRepository;
    private final BookCopyRepository bookCopyRepository;
    private final UserMapper userMapper;
    private final BookCopyMapper bookCopyMapper;
    private final ObjectMapper objectMapper;

    // Danh sách các kết nối SSE Emitters active
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    /**
     * Đăng ký một SSE emitter mới cho clients (Frontend Kiosk).
     */
    public SseEmitter registerEmitter() {
        // Timeout 15 phút (900,000 ms)
        SseEmitter emitter = new SseEmitter(900000L);

        this.emitters.add(emitter);
        log.info("Client đăng ký SSE stream mới. Số lượng kết nối active: {}", emitters.size());

        emitter.onCompletion(() -> {
            log.info("SSE Connection hoàn tất.");
            this.emitters.remove(emitter);
        });

        emitter.onTimeout(() -> {
            log.info("SSE Connection timeout.");
            emitter.complete();
            this.emitters.remove(emitter);
        });

        emitter.onError((ex) -> {
            log.warn("SSE Connection gặp lỗi: {}", ex.getMessage());
            emitter.complete();
            this.emitters.remove(emitter);
        });

        // Gửi event ping đầu tiên để mở stream thành công
        try {
            emitter.send(SseEmitter.event()
                    .name("INIT")
                    .data("SSE stream initialized successfully"));
        } catch (IOException e) {
            log.error("Lỗi khi gửi sự kiện INIT: {}", e.getMessage());
            emitter.complete();
            this.emitters.remove(emitter);
        }

        return emitter;
    }

    /**
     * Nhận sự kiện quét NFC từ thiết bị và phát sóng (broadcast) cho tất cả SSE clients.
     */
    @Transactional(readOnly = true)
    public NfcScanResponse scanNfc(String uid) {
        if (uid == null) {
            throw new IllegalArgumentException("UID cannot be null");
        }

        // Chuẩn hóa UID: Viết hoa, xóa khoảng trắng thừa
        String cleanUid = uid.trim().toUpperCase();
        log.info("Nhận sự kiện quét NFC UID: {}", cleanUid);

        NfcScanResponse response;

        // 1. Kiểm tra xem UID thuộc về User (Sinh viên) hay không
        Optional<User> userOpt = userRepository.findByNfcCardUid(cleanUid);
        if (userOpt.isPresent()) {
            UserResponse userResponse = userMapper.toResponse(userOpt.get());
            response = NfcScanResponse.builder()
                    .type("USER")
                    .data(userResponse)
                    .build();
            log.info("Nhận diện thành công USER: {} (Mã SV: {})", userResponse.getFullName(), userResponse.getStudentId());
        } 
        // 2. Nếu không, kiểm tra xem thuộc về BookCopy hay không
        else {
            Optional<BookCopy> copyOpt = bookCopyRepository.findByNfcTagUid(cleanUid);
            if (copyOpt.isPresent()) {
                BookCopyResponse copyResponse = bookCopyMapper.toResponse(copyOpt.get());
                response = NfcScanResponse.builder()
                        .type("BOOK_COPY")
                        .data(copyResponse)
                        .build();
                log.info("Nhận diện thành công BOOK_COPY: ID {}, Status: {}", copyResponse.getId(), copyResponse.getStatus());
            } 
            // 3. Nếu không thuộc về bất kỳ thực thể nào trong hệ thống
            else {
                response = NfcScanResponse.builder()
                        .type("UNKNOWN")
                        .data(NfcUnknownResponse.builder().uid(cleanUid).build())
                        .build();
                log.info("Nhận diện thẻ UNKNOWN UID: {}", cleanUid);
            }
        }

        // Phát sóng sự kiện tới các trang đang kết nối SSE
        broadcastNfcEvent(response);

        return response;
    }

    /**
     * Phát sóng sự kiện NFC tới tất cả SSE emitters đang kết nối.
     */
    public void broadcastNfcEvent(NfcScanResponse event) {
        if (emitters.isEmpty()) {
            log.debug("Không có kết nối SSE active nào. Bỏ qua broadcast.");
            return;
        }

        log.info("Đang phát sóng sự kiện NFC [{}] tới {} SSE clients...", event.getType(), emitters.size());
        
        String jsonPayload;
        try {
            jsonPayload = objectMapper.writeValueAsString(event);
        } catch (Exception e) {
            log.error("Lỗi khi chuyển đổi sự kiện NFC sang JSON: {}", e.getMessage());
            return;
        }

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("nfc-scan")
                        .data(jsonPayload));
            } catch (IOException e) {
                log.warn("Lỗi khi gửi sự kiện đến SSE Client. Tiến hành xóa emitter.");
                emitter.complete();
                emitters.remove(emitter);
            }
        }
    }

    /**
     * Đăng ký (gán) thẻ NFC cho User.
     * Đảm bảo tính Idempotent và chống trùng UID.
     */
    @Transactional
    public NfcStudentResponse registerUser(NfcRegisterUserRequest request) {
        User user = userRepository.findByIdForUpdate(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getUserId()));

        if (user.getRole() != Role.STUDENT) {
            throw new IllegalArgumentException("NFC cards can only be assigned to student accounts");
        }

        String cleanUid = request.getNfcCardUid().trim().toUpperCase();

        // Check xem thẻ đã thuộc về chính User này chưa (Idempotent check)
        if (cleanUid.equals(user.getNfcCardUid())) {
            log.info("Idempotent check: UID {} đã được đăng ký cho User ID {}", cleanUid, user.getId());
            return toNfcStudentResponse(user);
        }

        // Chống race condition & Đảm bảo tính UNIQUE: Kiểm tra xem UID có thuộc về User hay BookCopy khác không
        validateNfcUidUniqueness(cleanUid);

        user.setNfcCardUid(cleanUid);
        User savedUser = userRepository.save(user);
        log.info("Đăng ký thành công NFC card UID {} cho User ID {}", cleanUid, user.getId());

        return toNfcStudentResponse(savedUser);
    }

    @Transactional(readOnly = true)
    public PageResponse<NfcStudentResponse> searchStudents(String query, Pageable pageable) {
        String normalizedQuery = query == null ? "" : query.trim();
        Page<User> page = userRepository.searchByRole(Role.STUDENT, normalizedQuery, pageable);
        List<NfcStudentResponse> content = page.getContent().stream()
                .map(this::toNfcStudentResponse)
                .toList();
        return PageResponse.from(page, content);
    }

    /**
     * Đăng ký (gán) thẻ NFC cho Book Copy.
     * Đảm bảo tính Idempotent và chống trùng UID.
     */
    @Transactional
    public BookCopyResponse registerBookCopy(NfcRegisterBookCopyRequest request) {
        BookCopy copy = bookCopyRepository.findById(request.getCopyId())
                .orElseThrow(() -> new ResourceNotFoundException("BookCopy", "id", request.getCopyId()));

        String cleanUid = request.getNfcTagUid().trim().toUpperCase();

        // Check xem thẻ đã thuộc về chính Book Copy này chưa (Idempotent check)
        if (cleanUid.equals(copy.getNfcTagUid())) {
            log.info("Idempotent check: UID {} đã được đăng ký cho Book Copy ID {}", cleanUid, copy.getId());
            return bookCopyMapper.toResponse(copy);
        }

        // Chống race condition & Đảm bảo tính UNIQUE: Kiểm tra xem UID có thuộc về User hay BookCopy khác không
        validateNfcUidUniqueness(cleanUid);

        copy.setNfcTagUid(cleanUid);
        BookCopy savedCopy = bookCopyRepository.save(copy);
        log.info("Đăng ký thành công NFC tag UID {} cho Book Copy ID {}", cleanUid, copy.getId());

        return bookCopyMapper.toResponse(savedCopy);
    }

    /**
     * Helper kiểm tra tính duy nhất của NFC UID trong hệ thống.
     */
    private void validateNfcUidUniqueness(String uid) {
        Optional<User> otherUser = userRepository.findByNfcCardUid(uid);
        if (otherUser.isPresent()) {
            throw new IllegalArgumentException("NFC UID '" + uid + "' is already bound to user: " + otherUser.get().getFullName());
        }

        Optional<BookCopy> otherCopy = bookCopyRepository.findByNfcTagUid(uid);
        if (otherCopy.isPresent()) {
            throw new IllegalArgumentException("NFC UID '" + uid + "' is already bound to book copy ID: " + otherCopy.get().getId());
        }
    }

    private NfcStudentResponse toNfcStudentResponse(User user) {
        return NfcStudentResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .studentId(user.getStudentId())
                .isActive(user.getIsActive())
                .nfcCardUid(user.getNfcCardUid())
                .build();
    }
}
