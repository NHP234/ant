package com.example.demo.audit;

import com.example.demo.model.entity.AuditLog;
import com.example.demo.model.entity.User;
import com.example.demo.repository.AuditLogRepository;
import com.example.demo.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditAspect {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Around("@annotation(auditable)")
    public Object audit(ProceedingJoinPoint joinPoint, Auditable auditable) throws Throwable {
        Object result = joinPoint.proceed();

        try {
            Long entityId = extractEntityId(joinPoint, result);
            String details = buildDetails(joinPoint, auditable);
            User user = getCurrentUser();
            String ip = getClientIp();

            AuditLog auditLog = AuditLog.builder()
                    .user(user)
                    .action(auditable.action())
                    .entityType(auditable.entityType())
                    .entityId(entityId != null ? entityId : 0L)
                    .details(details)
                    .ipAddress(ip)
                    .build();

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.warn("Failed to save audit log: {}", e.getMessage());
        }

        return result;
    }

    private Long extractEntityId(ProceedingJoinPoint joinPoint, Object result) {
        for (Object arg : joinPoint.getArgs()) {
            if (arg instanceof Long id) {
                return id;
            }
        }
        if (result != null) {
            try {
                var method = result.getClass().getMethod("getId");
                return (Long) method.invoke(result);
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private String buildDetails(ProceedingJoinPoint joinPoint, Auditable auditable) {
        return String.format("%s.%s - %s %s",
                joinPoint.getTarget().getClass().getSimpleName(),
                joinPoint.getSignature().getName(),
                auditable.action(),
                auditable.entityType());
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            return userRepository.findByUsername(auth.getName()).orElse(null);
        }
        return null;
    }

    private String getClientIp() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                String forwarded = request.getHeader("X-Forwarded-For");
                return forwarded != null ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
            }
        } catch (Exception ignored) {
        }
        return null;
    }
}
