package com.shivani.taskmanager.config;

import com.shivani.taskmanager.model.Role;
import com.shivani.taskmanager.model.User;
import com.shivani.taskmanager.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminName;
    private final String adminEmail;
    private final String adminPassword;
    private final boolean resetAdminPasswordOnStartup;

    public DataInitializer(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        @Value("${app.admin.name:}") String adminName,
        @Value("${app.admin.email:}") String adminEmail,
        @Value("${app.admin.password:}") String adminPassword,
        @Value("${app.admin.reset-password-on-startup:false}") boolean resetAdminPasswordOnStartup
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminName = adminName;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.resetAdminPasswordOnStartup = resetAdminPasswordOnStartup;
    }

    @Override
    public void run(String... args) {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            return;
        }
        userRepository.findByEmailIgnoreCase(adminEmail).ifPresentOrElse(existingAdmin -> {
            boolean changed = false;
            if (existingAdmin.getRole() != Role.ADMIN) {
                existingAdmin.setRole(Role.ADMIN);
                changed = true;
            }
            if (resetAdminPasswordOnStartup) {
                existingAdmin.setPasswordHash(passwordEncoder.encode(adminPassword));
                changed = true;
            }
            if (adminName != null && !adminName.isBlank() && !adminName.trim().equals(existingAdmin.getName())) {
                existingAdmin.setName(adminName.trim());
                changed = true;
            }
            if (changed) {
                userRepository.save(existingAdmin);
            }
        }, () -> {
            User admin = new User();
            admin.setName(adminName == null || adminName.isBlank() ? "Project Admin" : adminName);
            admin.setEmail(adminEmail.toLowerCase());
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
            admin.setRole(Role.ADMIN);
            userRepository.save(admin);
        });
    }
}
