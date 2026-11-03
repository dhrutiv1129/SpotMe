package com.spotme.workout;

import java.time.LocalDate;
import java.util.List;

/** Saved workout result. Exercises and sets retain the input ordering and decimal weights. */
public record WorkoutResponse(
    long id, LocalDate date, List<WorkoutRequest.ExerciseInput> exercises) {
  public WorkoutResponse {
    exercises = exercises.stream()
        .map(exercise -> new WorkoutRequest.ExerciseInput(
            exercise.exerciseId(), List.copyOf(exercise.sets())))
        .toList();
  }
}
