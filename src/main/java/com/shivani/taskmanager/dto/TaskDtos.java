package com.shivani.taskmanager.dto;

import com.shivani.taskmanager.model.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public class TaskDtos {
    @SuppressWarnings("unused")
    public record TaskRequest(
        @NotBlank @Size(max = 160) String title,
        @Size(max = 800) String description,
        @NotNull Long projectId,
        Long assignedToId,
        LocalDate deadline,
        TaskStatus status
    ) {
    }

    @SuppressWarnings("unused")
    public record StatusRequest(@NotNull TaskStatus status) {
    }
}
