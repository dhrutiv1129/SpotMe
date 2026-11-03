package com.spotme.recommendation;

import java.util.List;
import java.util.Objects;
import java.util.Set;

/** Keeps catalog substitutes that serve the same muscles and fit available equipment. */
public final class AlternativeFilter {
  public List<AlternativeCandidate> filter(
      ExerciseOption original, List<AlternativeCandidate> candidates,
      Set<String> availableEquipment, boolean beginnerOnly) {
    Objects.requireNonNull(original);
    Objects.requireNonNull(candidates);
    Set<String> equipment = Set.copyOf(Objects.requireNonNull(availableEquipment));
    if (equipment.stream().anyMatch(String::isBlank) || candidates.stream().anyMatch(Objects::isNull)) {
      throw new IllegalArgumentException("Equipment tags and candidates must be nonnull and nonblank");
    }
    return candidates.stream()
        .filter(candidate -> candidate.exercise().id() != original.id())
        .filter(candidate -> !java.util.Collections.disjoint(
            candidate.exercise().muscleGroups(), original.muscleGroups()))
        .filter(candidate -> equipment.containsAll(candidate.exercise().requiredEquipment()))
        .filter(candidate -> !beginnerOnly
            || candidate.exercise().difficulty() == ExerciseOption.Difficulty.BEGINNER)
        .toList();
  }
}
