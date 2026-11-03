package com.spotme.workout;

import java.util.List;

/** Validation failures with indexed field paths for a future HTTP error mapper. */
public final class WorkoutValidationException extends IllegalArgumentException {
  private final List<Violation> violations;

  public WorkoutValidationException(List<Violation> violations) {
    super("Workout validation failed");
    this.violations = List.copyOf(violations);
  }

  public List<Violation> violations() {
    return violations;
  }

  public record Violation(String field, String code, String message) {}
}
