package com.spotme.workout;

import java.util.Objects;

/** Creation orchestration, independent of HTTP and database entities. */
public final class WorkoutServiceImpl implements WorkoutService {
  private final CurrentUser currentUser;
  private final WorkoutValidator validator;
  private final WorkoutStore store;

  public WorkoutServiceImpl(
      CurrentUser currentUser, WorkoutValidator validator, WorkoutStore store) {
    this.currentUser = Objects.requireNonNull(currentUser);
    this.validator = Objects.requireNonNull(validator);
    this.store = Objects.requireNonNull(store);
  }

  @Override
  public WorkoutResponse createWorkout(WorkoutRequest request) {
    long userId = currentUser.requireUserId();
    if (userId <= 0) {
      throw new IllegalStateException("Authenticated user ID must be positive");
    }
    // Snapshot collections before validation so the same values are validated, saved, and returned.
    WorkoutRequest snapshot = snapshot(request);
    validator.validate(snapshot);
    long id = store.save(userId, snapshot);
    if (id <= 0) {
      throw new IllegalStateException("Workout store must return a positive saved ID");
    }
    return new WorkoutResponse(id, snapshot.date(), snapshot.exercises());
  }

  private static WorkoutRequest snapshot(WorkoutRequest request) {
    if (request == null || request.exercises() == null) {
      return request;
    }
    // Stream.toList preserves null elements so the validator can produce field-specific errors.
    var exercises = request.exercises().stream().map(exercise -> {
      if (exercise == null || exercise.sets() == null) {
        return exercise;
      }
      return new WorkoutRequest.ExerciseInput(
          exercise.exerciseId(), exercise.sets().stream().toList());
    }).toList();
    return new WorkoutRequest(request.date(), exercises);
  }
}
