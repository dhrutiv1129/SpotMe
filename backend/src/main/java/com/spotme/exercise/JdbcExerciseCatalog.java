package com.spotme.exercise;

import com.spotme.workout.ExerciseCatalog;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcExerciseCatalog implements ExerciseCatalog {
  private final JdbcTemplate jdbc;

  public JdbcExerciseCatalog(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Exercise> exercises() {
    return jdbc.query(
        "SELECT * FROM beta_exercises ORDER BY id",
        (rs, row) ->
            new Exercise(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("muscle_group"),
                List.of(rs.getString("equipment").split(",")),
                rs.getString("difficulty"),
                rs.getBoolean("bodyweight"),
                rs.getString("instructions")));
  }

  @Override
  public Optional<ExerciseInfo> findById(long id) {
    return jdbc
        .query(
            "SELECT bodyweight FROM beta_exercises WHERE id=?",
            (rs, row) -> new ExerciseInfo(rs.getBoolean(1)),
            id)
        .stream()
        .findFirst();
  }

}
