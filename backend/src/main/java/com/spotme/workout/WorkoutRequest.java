package com.spotme.workout;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Input contract shared with the future workout API. Weight uses one agreed application unit. */
public record WorkoutRequest(LocalDate date, List<ExerciseInput> exercises) {
  public record ExerciseInput(Long exerciseId, List<SetInput> sets) {}

  public record SetInput(Integer reps, BigDecimal weight) {}
}
