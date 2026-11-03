package com.spotme.recommendation;

import java.util.Objects;

/** A catalog-approved substitute and its relationship relevance (0–100). */
public record AlternativeCandidate(ExerciseOption exercise, int relevance) {
  public AlternativeCandidate {
    exercise = Objects.requireNonNull(exercise);
    if (relevance < 0 || relevance > 100) {
      throw new IllegalArgumentException("Relevance must be between 0 and 100");
    }
  }
}
