package com.spotme.workout;

import java.util.Objects;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Creation orchestration, independent of HTTP and database entities. */
public final class WorkoutServiceImpl implements WorkoutService {
  private final CurrentUser currentUser;
  private final WorkoutValidator validator;
  private final WorkoutStore store;
  private final WorkoutHistoryReader historyReader;

  public WorkoutServiceImpl(
      CurrentUser currentUser, WorkoutValidator validator, WorkoutStore store,
      WorkoutHistoryReader historyReader) {
    this.currentUser = Objects.requireNonNull(currentUser);
    this.validator = Objects.requireNonNull(validator);
    this.store = Objects.requireNonNull(store);
    this.historyReader = Objects.requireNonNull(historyReader);
  }

  @Override
  public WorkoutResponse createWorkout(WorkoutRequest request) {
    long userId = requireUserId();
    // Snapshot collections before validation so the same values are validated, saved, and returned.
    WorkoutRequest snapshot = snapshot(request);
    validator.validate(snapshot);
    long id = store.save(userId, snapshot);
    if (id <= 0) {
      throw new IllegalStateException("Workout store must return a positive saved ID");
    }
    return new WorkoutResponse(id, snapshot.date(), snapshot.exercises());
  }

  @Override
  public List<WorkoutResponse> getWorkoutHistory() {
    long userId = requireUserId();
    var rows = historyReader.findByUserId(userId);
    if (rows.stream().anyMatch(row -> row.userId() != userId)) {
      throw new IllegalStateException("History adapter returned a different owner's workout");
    }
    return rows.stream().map(WorkoutHistoryReader.OwnedWorkout::workout)
        .sorted(Comparator.comparing(WorkoutResponse::date).reversed()
            .thenComparing(Comparator.comparingLong(WorkoutResponse::id).reversed()))
        .toList();
  }

  @Override
  public List<SetHistoryEntry> getSetHistory(long exerciseId) {
    if (exerciseId <= 0) {
      throw new IllegalArgumentException("Exercise ID must be positive");
    }
    List<SetHistoryEntry> result = new ArrayList<>();
    for (var workout : getWorkoutHistory()) {
      for (int i = 0; i < workout.exercises().size(); i++) {
        var exercise = workout.exercises().get(i);
        if (exercise.exerciseId() != exerciseId) {
          continue;
        }
        for (int j = 0; j < exercise.sets().size(); j++) {
          var set = exercise.sets().get(j);
          result.add(new SetHistoryEntry(workout.id(), workout.date(), exerciseId,
              i + 1, j + 1, set.reps(), set.weight()));
        }
      }
    }
    return List.copyOf(result);
  }

  @Override
  public List<LocalDate> getWorkoutDates() {
    return getWorkoutHistory().stream().map(WorkoutResponse::date).distinct().sorted().toList();
  }

  private long requireUserId() {
    long userId = currentUser.requireUserId();
    if (userId <= 0) {
      throw new IllegalStateException("Authenticated user ID must be positive");
    }
    return userId;
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
