package com.example.demo.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class TimeConfigTest {

    @Test
    void clockUsesConfiguredApplicationTimeZone() {
        TimeConfig config = new TimeConfig("Asia/Ho_Chi_Minh");

        ZoneId zoneId = config.appZoneId();
        Clock clock = config.clock(zoneId);

        assertThat(zoneId).isEqualTo(ZoneId.of("Asia/Ho_Chi_Minh"));
        assertThat(clock.getZone()).isEqualTo(ZoneId.of("Asia/Ho_Chi_Minh"));
    }
}
