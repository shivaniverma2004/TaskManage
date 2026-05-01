package com.shivani.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;

public class ProjectDtos {
    @SuppressWarnings("unused")
    public record ProjectRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 600) String description,
        Long teamId,
        Set<Long> memberIds
    ) {
    }

    @SuppressWarnings("unused")
    public record MemberRequest(@NotNull Long userId) {
    }
}
