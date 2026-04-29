package com.example.demo.service;

import com.example.demo.dto.response.NotificationResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.NotificationMapper;
import com.example.demo.model.entity.Notification;
import com.example.demo.model.entity.User;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationMapper notificationMapper;

    public PageResponse<NotificationResponse> getMyNotifications(String username, Pageable pageable) {
        User user = findUserOrThrow(username);
        Page<Notification> page = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);
        List<NotificationResponse> content = page.getContent().stream()
                .map(notificationMapper::toResponse)
                .toList();
        return PageResponse.from(page, content);
    }

    public int getUnreadCount(String username) {
        User user = findUserOrThrow(username);
        return notificationRepository.countByUserIdAndIsReadFalse(user.getId());
    }

    @Transactional
    public NotificationResponse markAsRead(Long notificationId, String username) {
        User user = findUserOrThrow(username);
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("This notification does not belong to you");
        }

        notification.setIsRead(true);
        notification = notificationRepository.save(notification);
        return notificationMapper.toResponse(notification);
    }

    @Transactional
    public int markAllAsRead(String username) {
        User user = findUserOrThrow(username);
        return notificationRepository.markAllAsRead(user.getId());
    }

    private User findUserOrThrow(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
    }
}
