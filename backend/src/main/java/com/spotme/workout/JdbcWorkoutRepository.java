package com.spotme.workout;

import com.spotme.common.Digests;
import java.sql.Date;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class JdbcWorkoutRepository implements WorkoutStore, WorkoutHistoryReader {
  private final JdbcTemplate jdbc;

  public JdbcWorkoutRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  /** Calls go through the Spring proxy from the service, making the complete write atomic. */
  @Override
  @Transactional
  public long save(long userId, WorkoutRequest workout) {
    // The API's idempotency transaction supplies the row; direct domain use gets a fresh key.
    return insert(
        userId, workout, UUID.randomUUID().toString(), Digests.sha256(workout.toString()));
  }

  private long insert(long userId, WorkoutRequest workout, String key, String hash) {
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

  /** Must run inside the save transaction; serializes requests from the same owner. */
  public void lockOwner(long owner) {
    jdbc.queryForObject("SELECT id FROM beta_users WHERE id=? FOR UPDATE", Long.class, owner);
  }

  public record PriorSave(long workoutId, String requestHash) {}

  public Optional<PriorSave> findSave(long owner, String key) {
    return jdbc.query(
        "SELECT id,request_hash FROM beta_workouts WHERE user_id=? AND request_key=?",
        (rs, row) -> new PriorSave(rs.getLong(1), rs.getString(2)), owner, key)
        .stream().findFirst();
  }

  public void recordSave(long owner, long workoutId, String key, String hash) {
    jdbc.update(
        "UPDATE beta_workouts SET request_key=?,request_hash=? WHERE id=? AND user_id=?",
        key, hash, workoutId, owner);
  }
}
