package com.spotme.analytics;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

/** Per-exercise external-load records; each metric carries its own achievement date. */
public record PersonalRecordDTO(
    long exerciseId, Achievement maxWeight, Optional<Achievement> estimatedOneRepMax,
    Achievement maxWorkoutVolume) {
  public record Achievement(BigDecimal value, LocalDate date, long workoutId) {}
}
