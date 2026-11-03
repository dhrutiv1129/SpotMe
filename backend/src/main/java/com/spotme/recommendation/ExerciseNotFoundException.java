package com.spotme.recommendation;

import java.util.NoSuchElementException;

/** Raised when a positive exercise ID is absent from the catalog. */
public final class ExerciseNotFoundException extends NoSuchElementException {
  public ExerciseNotFoundException(long id) {
    super("Exercise " + id + " was not found");
  }
}
