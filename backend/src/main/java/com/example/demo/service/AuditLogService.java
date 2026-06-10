package com.example.demo.service;

import com.example.demo.dto.response.AuditLogResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.mapper.AuditLogMapper;
import com.example.demo.model.entity.AuditLog;
import com.example.demo.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final AuditLogMapper auditLogMapper;

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> getAll(Pageable pageable) {
        Page<AuditLog> page = auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
        List<AuditLogResponse> content = page.getContent().stream()
                .map(auditLogMapper::toResponse)
                .toList();
        return PageResponse.from(page, content);
    }
}
