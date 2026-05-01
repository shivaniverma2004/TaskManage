package com.shivani.taskmanager.repository;

import com.shivani.taskmanager.model.Team;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TeamRepository extends JpaRepository<Team, Long> {
    @Query("select distinct t from Team t left join t.members m where t.leader.id = :userId or m.id = :userId")
    List<Team> findVisibleToUser(@Param("userId") Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Team t set t.leader = null where t.leader.id = :userId")
    int clearLeader(@Param("userId") Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "delete from team_members where user_id = :userId", nativeQuery = true)
    int removeMemberFromTeams(@Param("userId") Long userId);
}
