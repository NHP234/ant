package com.example.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

@Configuration
public class TimeConfig {

    private final String appTimeZone;

    public TimeConfig(@Value("${app.time-zone:Asia/Ho_Chi_Minh}") String appTimeZone) {
        this.appTimeZone = appTimeZone;
    }

    @Bean
    public ZoneId appZoneId() {
        return ZoneId.of(appTimeZone);
    }

    @Bean
    public Clock clock(ZoneId appZoneId) {
        return Clock.system(appZoneId);
    }
}
