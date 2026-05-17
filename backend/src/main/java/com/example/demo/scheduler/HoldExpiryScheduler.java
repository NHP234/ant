package com.example.demo.scheduler;

import com.example.demo.service.BookHoldService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class HoldExpiryScheduler {

    private final BookHoldService bookHoldService;

    @Scheduled(cron = "0 */30 * * * *")
    public void expireHolds() {
        log.info("Running hold expiry check...");
        int expired = bookHoldService.expireHolds();
        log.info("Hold expiry completed. Expired: {}", expired);
    }
}
