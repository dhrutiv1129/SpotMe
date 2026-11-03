package com.spotme.workout;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import com.spotme.workout.WorkoutValidationException.Violation;

/** Stateless input validation. Construct with the application's clock and catalog adapter. */
public final class WorkoutValidator {
  private final ExerciseCatalog catalog;
  private final Clock clock;

  public WorkoutValidator(ExerciseCatalog catalog, Clock clock) {
    this.catalog = Objects.requireNonNull(catalog);
    this.clock = Objects.requireNonNull(clock);
  }

  /** Validates without persistence; throws all discovered input errors together. */
  public void validate(WorkoutRequest request) {
    List<Violation> errors = new ArrayList<>();
    if (request == null) {
      add(errors, "workout", "required", "Workout is required");
    } else {
      if (request.date() == null) {
        add(errors, "date", "required", "Workout date is required");
      } else if (request.date().isAfter(LocalDate.now(clock))) {
        add(errors, "date", "future_date", "Workout date cannot be in the future");
      }
      if (request.exercises() == null || request.exercises().isEmpty()) {
        add(errors, "exercises", "required", "At least one exercise is required");
      } else {
        Map<Long, Optional<ExerciseCatalog.ExerciseInfo>> metadata = new HashMap<>();
        for (int i = 0; i < request.exercises().size(); i++) {
          validateExercise(request.exercises().get(i), "exercises[" + i + "]", metadata, errors);
        }
      }
    }
    if (!errors.isEmpty()) {
      throw new WorkoutValidationException(errors);
    }
  }

  private void validateExercise(
      WorkoutRequest.ExerciseInput exercise, String path,
      Map<Long, Optional<ExerciseCatalog.ExerciseInfo>> metadata, List<Violation> errors) {
    if (exercise == null) {
      add(errors, path, "required", "Exercise is required");
      return;
    }
    ExerciseCatalog.ExerciseInfo info = null;
    if (exercise.exerciseId() == null || exercise.exerciseId() <= 0) {
      add(errors, path + ".exerciseId", "invalid_id", "A positive exercise ID is required");
    } else {
      info = metadata.computeIfAbsent(exercise.exerciseId(), catalog::findById).orElse(null);
      if (info == null) {
        add(errors, path + ".exerciseId", "unknown_exercise", "Exercise does not exist");
      }
    }
    if (exercise.sets() == null || exercise.sets().isEmpty()) {
      add(errors, path + ".sets", "required", "At least one set is required");
      return;
    }
    for (int i = 0; i < exercise.sets().size(); i++) {
      validateSet(exercise.sets().get(i), path + ".sets[" + i + "]", info, errors);
    }
  }

  private void validateSet(
      WorkoutRequest.SetInput set, String path,
      ExerciseCatalog.ExerciseInfo info, List<Violation> errors) {
    if (set == null) {
      add(errors, path, "required", "Set is required");
      return;
    }
    if (set.reps() == null || set.reps() <= 0) {
      add(errors, path + ".reps", "invalid_reps", "Reps must be a positive whole number");
    }
    if (set.weight() == null) {
      add(errors, path + ".weight", "required", "Weight is required");
    } else if (set.weight().signum() < 0) {
      add(errors, path + ".weight", "negative_weight", "Weight cannot be negative");
    } else if (set.weight().signum() == 0 && info != null && !info.supportsBodyweight()) {
      add(errors, path + ".weight", "zero_weight", "Zero weight is only allowed for bodyweight exercises");
    }
  }

  private static void add(List<Violation> errors, String field, String code, String message) {
    errors.add(new Violation(field, code, message));
  }
}
