package com.spotme.workout;

/** Persistence boundary to be implemented by the database component. */
@FunctionalInterface
public interface WorkoutStore {
  /**
   * Saves a complete validated workout owned by userId, returning its generated positive ID.
   * The adapter must map list positions to exercise/set order and save the workout, exercises,
   * and sets in one database transaction. A failure must roll back all rows and propagate.
   */
  long save(long userId, WorkoutRequest workout);
}
