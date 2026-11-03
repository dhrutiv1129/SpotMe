package com.spotme.backend.beta;

import com.spotme.recommendation.*;
import com.spotme.recommendation.RecommendationCatalog.*;
import com.spotme.workout.*;
import java.sql.Date;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class DatabaseAdapters
    implements WorkoutStore, WorkoutHistoryReader, ExerciseCatalog, RecommendationCatalog {
  public record Exercise(
      long id,
      String name,
      String muscleGroup,
      List<String> requiredEquipment,
      String difficulty,
      boolean bodyweight,
      String instructions) {}

  private final JdbcTemplate jdbc;

  public DatabaseAdapters(JdbcTemplate jdbc) {
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

  @Override
  public Optional<CatalogExercise> findExercise(long id) {
    return exercises().stream().filter(e -> e.id() == id).map(this::catalog).findFirst();
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
    exercises().forEach(e -> all.put(e.id(), e));
    return jdbc.query(
        "SELECT alternative_id,relevance FROM beta_alternatives WHERE original_id=? ORDER BY"
            + " alternative_id",
        (rs, row) -> new CatalogAlternative(catalog(all.get(rs.getLong(1))), rs.getInt(2)),
        id);
  }

  /** Calls go through the Spring proxy from the service, making the complete write atomic. */
  @Override
  @Transactional
  public long save(long userId, WorkoutRequest workout) {
    // The API's idempotency transaction supplies the row; direct domain use gets a fresh key.
    return insert(
        userId, workout, UUID.randomUUID().toString(), Authentication.digest(workout.toString()));
  }

  public long insert(long userId, WorkoutRequest workout, String key, String hash) {
    var holder = new GeneratedKeyHolder();
    jdbc.update(
        connection -> {
          var statement =
              connection.prepareStatement(
                  "INSERT INTO beta_workouts(user_id,workout_date,request_key,request_hash) VALUES"
                      + " (?,?,?,?)",
                  new String[] {"id"});
          statement.setLong(1, userId);
          statement.setDate(2, Date.valueOf(workout.date()));
          statement.setString(3, key);
          statement.setString(4, hash);
          return statement;
        },
        holder);
    long id = holder.getKey().longValue();
    for (int e = 0; e < workout.exercises().size(); e++) {
      var exercise = workout.exercises().get(e);
      for (int s = 0; s < exercise.sets().size(); s++) {
        var set = exercise.sets().get(s);
        jdbc.update(
            "INSERT INTO"
                + " beta_sets(workout_id,exercise_id,exercise_position,set_position,reps,weight)"
                + " VALUES (?,?,?,?,?,?)",
            id,
            exercise.exerciseId(),
            e,
            s,
            set.reps(),
            set.weight());
      }
    }
    return id;
  }

  @Override
  @Transactional(readOnly = true)
  public List<OwnedWorkout> findByUserId(long userId) {
    return jdbc.query(
        "SELECT id,workout_date FROM beta_workouts WHERE user_id=? ORDER BY workout_date DESC,id"
            + " DESC",
        (rs, row) -> {
          long id = rs.getLong(1);
          Map<Integer, Long> ids = new LinkedHashMap<>();
          Map<Integer, List<WorkoutRequest.SetInput>> sets = new LinkedHashMap<>();
          jdbc.query(
              "SELECT exercise_position,exercise_id,reps,weight FROM beta_sets WHERE workout_id=?"
                  + " ORDER BY exercise_position,set_position",
              set -> {
                int position = set.getInt(1);
                ids.put(position, set.getLong(2));
                sets.computeIfAbsent(position, k -> new ArrayList<>())
                    .add(new WorkoutRequest.SetInput(set.getInt(3), set.getBigDecimal(4)));
              },
              id);
          var exercises =
              ids.entrySet().stream()
                  .map(e -> new WorkoutRequest.ExerciseInput(e.getValue(), sets.get(e.getKey())))
                  .toList();
          return new OwnedWorkout(
              userId, new WorkoutResponse(id, rs.getDate(2).toLocalDate(), exercises));
        },
        userId);
  }
}
