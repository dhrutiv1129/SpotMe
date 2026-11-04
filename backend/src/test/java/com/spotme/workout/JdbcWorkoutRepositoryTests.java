package com.spotme.workout;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class JdbcWorkoutRepositoryTests {
  @Autowired WorkoutStore store;
  @Autowired JdbcTemplate jdbc;

  @Test
  void failedSetInsertRollsBackWorkoutAndEarlierSets() {
    String email = UUID.randomUUID() + "@example.com";
    jdbc.update("INSERT INTO beta_users(email,password_hash) VALUES (?,?)", email, "test-only");
    long owner = jdbc.queryForObject("SELECT id FROM beta_users WHERE email=?", Long.class, email);
    int setsBefore = jdbc.queryForObject("SELECT COUNT(*) FROM beta_sets", Integer.class);
    var set = new WorkoutRequest.SetInput(8, new BigDecimal("25"));
    var input = new WorkoutRequest(LocalDate.of(2026, 1, 1), List.of(
        new WorkoutRequest.ExerciseInput(2L, List.of(set)),
        new WorkoutRequest.ExerciseInput(Long.MAX_VALUE, List.of(set))));

    // Bypass validation to force a failure after the workout and first set have been inserted.
    assertThatThrownBy(() -> store.save(owner, input))
        .isInstanceOf(DataIntegrityViolationException.class);

    assertThat(jdbc.queryForObject(
        "SELECT COUNT(*) FROM beta_workouts WHERE user_id=?", Integer.class, owner)).isZero();
    assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM beta_sets", Integer.class))
        .isEqualTo(setsBefore);
  }
}
