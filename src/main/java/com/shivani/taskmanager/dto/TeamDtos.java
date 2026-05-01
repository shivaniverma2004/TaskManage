package com.shivani.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Set;

public class TeamDtos {
    @SuppressWarnings("unused")
    public record TeamRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 500) String description,
        Long leaderId,
        Set<Long> memberIds
    ) {
    }
}
