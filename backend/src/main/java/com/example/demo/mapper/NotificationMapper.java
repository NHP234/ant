package com.example.demo.mapper;

import com.example.demo.dto.response.NotificationResponse;
import com.example.demo.model.entity.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface NotificationMapper {

    @Mapping(target = "type", expression = "java(notification.getType().name())")
    NotificationResponse toResponse(Notification notification);
}
