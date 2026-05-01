package com.shivani.taskmanager.repository;

import com.shivani.taskmanager.model.SessionToken;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionTokenRepository extends JpaRepository<SessionToken, String> {
    Optional<SessionToken> findByTokenAndExpiresAtAfter(String token, Instant now);
    void deleteByExpiresAtBefore(Instant now);
    void deleteByUserId(Long userId);
}
