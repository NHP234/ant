package com.example.demo.service;

import com.example.demo.dto.response.AuditLogResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.mapper.AuditLogMapper;
import com.example.demo.model.entity.AuditLog;
import com.example.demo.repository.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock private AuditLogRepository auditLogRepository;
    @Mock private AuditLogMapper auditLogMapper;

    @InjectMocks private AuditLogService auditLogService;

    @Test
    void getAll_mapsEntitiesToResponses() {
        var pageable = PageRequest.of(0, 20);
        var log = AuditLog.builder().id(1L).action("BORROW").build();
        var response = AuditLogResponse.builder().id(1L).action("BORROW").build();
        var page = new PageImpl<>(List.of(log), pageable, 1);

        when(auditLogRepository.findAllByOrderByCreatedAtDesc(pageable)).thenReturn(page);
        when(auditLogMapper.toResponse(log)).thenReturn(response);

        PageResponse<AuditLogResponse> result = auditLogService.getAll(pageable);

        assertThat(result.getContent()).containsExactly(response);
        assertThat(result.getTotalElements()).isEqualTo(1);
        verify(auditLogMapper).toResponse(log);
    }
}
