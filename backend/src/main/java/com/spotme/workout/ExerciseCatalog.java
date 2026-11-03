package com.spotme.workout;

import java.util.Optional;

/** Backend-owned catalog lookup; the database adapter must supply trusted exercise metadata. */
@FunctionalInterface
public interface ExerciseCatalog {
  /** Empty means unknown exercise; failures accessing the catalog must propagate. */
  Optional<ExerciseInfo> findById(long exerciseId);

  record ExerciseInfo(boolean supportsBodyweight) {}
}
