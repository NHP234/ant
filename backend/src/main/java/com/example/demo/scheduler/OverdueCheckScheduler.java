package com.example.demo.scheduler;

import com.example.demo.service.BorrowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OverdueCheckScheduler {

    private final BorrowService borrowService;

    @Scheduled(cron = "0 0 0 * * *")
    public void checkOverdueBooks() {
        log.info("Running overdue check...");
        borrowService.checkAndMarkOverdue();
        log.info("Overdue check completed.");
    }
}
