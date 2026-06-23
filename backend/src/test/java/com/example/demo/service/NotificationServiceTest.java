package com.example.demo.service;

import com.example.demo.dto.response.NotificationResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.NotificationMapper;
import com.example.demo.model.entity.Notification;
import com.example.demo.model.entity.User;
import com.example.demo.model.enums.NotificationType;
import com.example.demo.model.enums.Role;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationMapper notificationMapper;

    @InjectMocks private NotificationService notificationService;

    private User student;
    private Notification notification;

    @BeforeEach
    void setUp() {
        student = User.builder()
                .id(1L)
                .username("student01")
                .role(Role.STUDENT)
                .build();
        notification = Notification.builder()
                .id(10L)
                .user(student)
                .type(NotificationType.HOLD_FULFILLED)
                .title("Sách đã sẵn sàng")
                .message("Vui lòng đến quầy nhận sách")
                .isRead(false)
                .build();
    }

    @Test
    void createNotificationPersistsUnreadNotificationForUser() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Notification result = notificationService.createNotification(
                student,
                NotificationType.OVERDUE_WARNING,
                "Sắp đến hạn trả",
                "Bạn còn 2 ngày để trả sách");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification saved = captor.getValue();
        assertThat(saved.getUser()).isEqualTo(student);
        assertThat(saved.getType()).isEqualTo(NotificationType.OVERDUE_WARNING);
        assertThat(saved.getTitle()).isEqualTo("Sắp đến hạn trả");
        assertThat(saved.getMessage()).isEqualTo("Bạn còn 2 ngày để trả sách");
        assertThat(saved.getIsRead()).isFalse();
        assertThat(result).isSameAs(saved);
    }

    @Test
    void getMyNotificationsReturnsMappedPageForCurrentUser() {
        PageRequest pageable = PageRequest.of(0, 10);
        NotificationResponse response = NotificationResponse.builder().id(10L).title("Sách đã sẵn sàng").build();

        when(userRepository.findByUsername("student01")).thenReturn(Optional.of(student));
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(1L, pageable))
                .thenReturn(new PageImpl<>(List.of(notification), pageable, 1));
        when(notificationMapper.toResponse(notification)).thenReturn(response);

        PageResponse<NotificationResponse> result = notificationService.getMyNotifications("student01", pageable);

        assertThat(result.getContent()).containsExactly(response);
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getUnreadCountCountsOnlyCurrentUserUnreadNotifications() {
        when(userRepository.findByUsername("student01")).thenReturn(Optional.of(student));
        when(notificationRepository.countByUserIdAndIsReadFalse(1L)).thenReturn(3);

        int result = notificationService.getUnreadCount("student01");

        assertThat(result).isEqualTo(3);
    }

    @Nested
    @DisplayName("markAsRead")
    class MarkAsRead {

        @Test
        void marksOwnedNotificationAsRead() {
            NotificationResponse response = NotificationResponse.builder().id(10L).isRead(true).build();

            when(userRepository.findByUsername("student01")).thenReturn(Optional.of(student));
            when(notificationRepository.findById(10L)).thenReturn(Optional.of(notification));
            when(notificationRepository.save(notification)).thenReturn(notification);
            when(notificationMapper.toResponse(notification)).thenReturn(response);

            NotificationResponse result = notificationService.markAsRead(10L, "student01");

            assertThat(notification.getIsRead()).isTrue();
            assertThat(result.getIsRead()).isTrue();
            verify(notificationRepository).save(notification);
        }

        @Test
        void rejectsNotificationOwnedByAnotherUser() {
            User otherUser = User.builder().id(2L).username("other").role(Role.STUDENT).build();
            notification.setUser(otherUser);

            when(userRepository.findByUsername("student01")).thenReturn(Optional.of(student));
            when(notificationRepository.findById(10L)).thenReturn(Optional.of(notification));

            assertThatThrownBy(() -> notificationService.markAsRead(10L, "student01"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("does not belong");

            verify(notificationRepository, never()).save(any());
        }

        @Test
        void throwsWhenNotificationNotFound() {
            when(userRepository.findByUsername("student01")).thenReturn(Optional.of(student));
            when(notificationRepository.findById(404L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> notificationService.markAsRead(404L, "student01"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Test
    void markAllAsReadUpdatesOnlyCurrentUserNotifications() {
        when(userRepository.findByUsername("student01")).thenReturn(Optional.of(student));
        when(notificationRepository.markAllAsRead(1L)).thenReturn(4);

        int result = notificationService.markAllAsRead("student01");

        assertThat(result).isEqualTo(4);
        verify(notificationRepository).markAllAsRead(1L);
    }

    @Test
    void throwsWhenCurrentUserNotFound() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.getUnreadCount("ghost"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
