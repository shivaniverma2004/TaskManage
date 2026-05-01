package com.shivani.taskmanager.repository;

import com.shivani.taskmanager.model.Project;
import com.shivani.taskmanager.model.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    @Query("select distinct p from Project p left join p.members m where p.createdBy.id = :userId or m.id = :userId")
    List<Project> findVisibleToUser(@Param("userId") Long userId);
    List<Project> findByTeamId(Long teamId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "delete from project_members where user_id = :userId", nativeQuery = true)
    int removeMemberFromProjects(@Param("userId") Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Project p set p.createdBy = :newOwner where p.createdBy.id = :oldOwnerId")
    int reassignCreatedBy(@Param("oldOwnerId") Long oldOwnerId, @Param("newOwner") User newOwner);
}
