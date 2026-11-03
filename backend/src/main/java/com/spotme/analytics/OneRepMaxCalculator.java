package com.spotme.analytics;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

/** Epley estimate using external load only, in the same unit as the input weight. */
public final class OneRepMaxCalculator {
  /**
   * One rep returns the actual weight. Zero external load has no meaningful estimate.
   * Other estimates are rounded once to six decimal places, HALF_UP.
   */
  public Optional<BigDecimal> calculate(BigDecimal weight, int reps) {
    validate(weight, reps);
    if (weight.signum() == 0) {
      return Optional.empty();
    }
    if (reps == 1) {
      return Optional.of(weight);
    }
    return Optional.of(weight.multiply(BigDecimal.valueOf((long) reps + 30))
        .divide(BigDecimal.valueOf(30), 6, RoundingMode.HALF_UP));
  }

  static void validate(BigDecimal weight, int reps) {
    if (weight == null || weight.signum() < 0) {
      throw new IllegalArgumentException("Weight must be provided and nonnegative");
    }
    if (reps <= 0) {
      throw new IllegalArgumentException("Reps must be positive");
    }
  }
}
