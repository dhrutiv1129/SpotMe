package com.spotme.recommendation;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

/** Database boundary for exercise details and curated substitution relationships. */
public interface RecommendationCatalog {
  Optional<CatalogExercise> findExercise(long id);

  List<CatalogAlternative> findAlternatives(long originalExerciseId);

  record CatalogExercise(ExerciseOption option, String name, String instructions) {
    public CatalogExercise {
      option = Objects.requireNonNull(option);
      if (name == null || name.isBlank()) {
        throw new IllegalArgumentException("Exercise name is required");
      }
      instructions = Objects.requireNonNull(instructions);
    }
  }

  record CatalogAlternative(CatalogExercise exercise, int relevance) {
    public CatalogAlternative {
      exercise = Objects.requireNonNull(exercise);
      new AlternativeCandidate(exercise.option(), relevance);
    }
  }
}
