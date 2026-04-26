package com.example.demo.config;

import com.example.demo.model.entity.User;
import com.example.demo.model.enums.Role;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username}")
    private String adminUsername;

    @Value("${app.admin.password}")
    private String adminPassword;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByUsername(adminUsername)) {
            log.info("Admin account '{}' already exists, skipping.", adminUsername);
            return;
        }

        User admin = User.builder()
                .username(adminUsername)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .email(adminEmail)
                .fullName("System Admin")
                .role(Role.ADMIN)
                .build();

        userRepository.save(admin);
        log.info("Admin account '{}' created successfully.", adminUsername);
    }
}
