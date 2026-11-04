package com.spotme.recommendation;

import com.spotme.exercise.Exercise;
import com.spotme.exercise.JdbcExerciseCatalog;
import com.spotme.recommendation.RecommendationCatalog.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcRecommendationCatalog implements RecommendationCatalog {
  private final JdbcTemplate jdbc;
  private final JdbcExerciseCatalog exercises;

  public JdbcRecommendationCatalog(JdbcTemplate jdbc, JdbcExerciseCatalog exercises) {
    this.jdbc = jdbc;
    this.exercises = exercises;
  }

  @Override
  public Optional<CatalogExercise> findExercise(long id) {
    return exercises.exercises().stream().filter(e -> e.id() == id).map(this::catalog).findFirst();
  }

  private CatalogExercise catalog(Exercise e) {
    return new CatalogExercise(
        new ExerciseOption(
            e.id(),
            Set.of(e.muscleGroup()),
            Set.copyOf(e.requiredEquipment()),
            ExerciseOption.Difficulty.valueOf(e.difficulty())),
        e.name(),
        e.instructions());
  }

  @Override
  public List<CatalogAlternative> findAlternatives(long id) {
    Map<Long, Exercise> all = new HashMap<>();
    exercises.exercises().forEach(e -> all.put(e.id(), e));
    return jdbc.query(
        "SELECT alternative_id,relevance FROM beta_alternatives WHERE original_id=? ORDER BY"
            + " alternative_id",
        (rs, row) -> new CatalogAlternative(catalog(all.get(rs.getLong(1))), rs.getInt(2)),
        id);
  }

}
