package com.spotme.workout;

import com.spotme.auth.CurrentUser;
import com.spotme.common.Digests;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Serializes saves per owner so a retried request cannot create a duplicate workout. */
@Service
public class SaveWorkout {
  private final JdbcWorkoutRepository repository;
  private final WorkoutService workouts;
  private final CurrentUser user;

  public SaveWorkout(JdbcWorkoutRepository repository, WorkoutService workouts, CurrentUser user) {
    this.repository = repository;
    this.workouts = workouts;
    this.user = user;
  }

  @Transactional
  public WorkoutResponse save(String key, WorkoutRequest input) {
    if (key == null || !key.matches("[A-Za-z0-9_-]{16,80}"))
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "A valid Idempotency-Key is required.");
    limit(input);
    long owner = user.requireUserId();
    repository.lockOwner(owner);
    String hash = Digests.sha256(input.toString());
    var prior = repository.findSave(owner, key);
    if (prior.isPresent()) {
      if (!hash.equals(prior.get().requestHash()))
        throw new ResponseStatusException(
            HttpStatus.CONFLICT, "This save key was already used for different workout data.");
      long id = prior.get().workoutId();
      return workouts.getWorkoutHistory().stream()
          .filter(w -> w.id() == id)
          .findFirst()
          .orElseThrow();
    }
    WorkoutResponse result = workouts.createWorkout(input);
    repository.recordSave(owner, result.id(), key, hash);
    return result;
  }

  private void limit(WorkoutRequest input) {
    if (input == null || input.exercises() == null)
      return; // Domain validator supplies field errors.
    if (input.exercises().size() > 30)
      throw new IllegalArgumentException("Limit workouts to 30 exercises.");
    for (var exercise : input.exercises()) {
      if (exercise == null || exercise.sets() == null) continue;
      if (exercise.sets().size() > 100)
        throw new IllegalArgumentException("Limit each exercise to 100 sets.");
      for (var set : exercise.sets()) {
        if (set == null) continue;
        if (set.reps() != null && set.reps() > 10000)
          throw new IllegalArgumentException("Reps must not exceed 10000.");
        if (set.weight() != null
            && (set.weight().scale() > 6
                || set.weight().abs().compareTo(new java.math.BigDecimal("1000000")) > 0))
          throw new IllegalArgumentException(
              "Weight must be at most 1000000 with up to six decimal places.");
      }
    }
  }
}
