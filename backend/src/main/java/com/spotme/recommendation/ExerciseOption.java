package com.spotme.recommendation;

import java.util.Objects;
import java.util.Set;

/** Trusted catalog metadata used by recommendation rules; tags use catalog-defined values. */
public record ExerciseOption(
    long id, Set<String> muscleGroups, Set<String> requiredEquipment, Difficulty difficulty) {
  public ExerciseOption {
    if (id <= 0) {
      throw new IllegalArgumentException("Exercise ID must be positive");
    }
    muscleGroups = Set.copyOf(Objects.requireNonNull(muscleGroups));
    requiredEquipment = Set.copyOf(Objects.requireNonNull(requiredEquipment));
    difficulty = Objects.requireNonNull(difficulty);
    if (muscleGroups.isEmpty() || muscleGroups.stream().anyMatch(String::isBlank)
        || requiredEquipment.stream().anyMatch(String::isBlank)) {
      throw new IllegalArgumentException("Exercise tags must be nonblank");
    }
  }

  public enum Difficulty { BEGINNER, INTERMEDIATE, ADVANCED }
}
