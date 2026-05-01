package com.shivani.taskmanager.controller;

import com.shivani.taskmanager.model.User;
import com.shivani.taskmanager.repository.ProjectRepository;
import com.shivani.taskmanager.repository.SessionTokenRepository;
import com.shivani.taskmanager.repository.TaskRepository;
import com.shivani.taskmanager.repository.TeamRepository;
import com.shivani.taskmanager.repository.UserRepository;
import com.shivani.taskmanager.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
@CrossOrigin
public class UserController {

    private final UserRepository userRepository;
    private final SessionTokenRepository sessionTokenRepository;
    private final TaskRepository taskRepository;
    private final TeamRepository teamRepository;
    private final ProjectRepository projectRepository;
    private final AuthService authService;

    public UserController(
        UserRepository userRepository,
        SessionTokenRepository sessionTokenRepository,
        TaskRepository taskRepository,
        TeamRepository teamRepository,
        ProjectRepository projectRepository,
        AuthService authService
    ) {
        this.userRepository = userRepository;
        this.sessionTokenRepository = sessionTokenRepository;
        this.taskRepository = taskRepository;
        this.teamRepository = teamRepository;
        this.projectRepository = projectRepository;
        this.authService = authService;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id, HttpServletRequest request) {
        User admin = authService.requireAdmin(request);
        if (admin.getId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot delete your own account");
        }
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        sessionTokenRepository.deleteByUserId(user.getId());
        taskRepository.unassignFromUser(user.getId());
        teamRepository.clearLeader(user.getId());
        teamRepository.removeMemberFromTeams(user.getId());
        projectRepository.removeMemberFromProjects(user.getId());
        projectRepository.reassignCreatedBy(user.getId(), admin);

        userRepository.delete(user);
    }
}

