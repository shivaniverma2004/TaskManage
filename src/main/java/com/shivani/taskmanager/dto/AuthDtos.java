package com.shivani.taskmanager.dto;

import com.shivani.taskmanager.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {
    @SuppressWarnings("unused")
    public record SignupRequest(
        @NotBlank @Size(max = 80) String name,
        @Email @NotBlank String email,
        @NotBlank @Size(min = 6, max = 80) String password,
        Role role
    ) {
    }

    @SuppressWarnings("unused")
    public record LoginRequest(
        @Email @NotBlank String email,
        @NotBlank String password
    ) {
    }

    @SuppressWarnings("unused")
    public record AuthResponse(String token, UserResponse user) {
    }

    @SuppressWarnings("unused")
    public record UserResponse(Long id, String name, String email, Role role) {
    }
}
