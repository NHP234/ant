package com.example.demo.mapper;

import com.example.demo.dto.response.AuditLogResponse;
import com.example.demo.model.entity.AuditLog;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AuditLogMapper {

    @Mapping(target = "userId", expression = "java(log.getUser() != null ? log.getUser().getId() : null)")
    @Mapping(target = "username", expression = "java(log.getUser() != null ? log.getUser().getUsername() : null)")
    @Mapping(target = "userFullName", expression = "java(log.getUser() != null ? log.getUser().getFullName() : null)")
    AuditLogResponse toResponse(AuditLog log);
}
