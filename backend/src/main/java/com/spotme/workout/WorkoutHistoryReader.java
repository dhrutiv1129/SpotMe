package com.spotme.workout;

import java.util.List;

/** Database read boundary. Implement with an owner-scoped query and fully loaded DTOs. */
@FunctionalInterface
public interface WorkoutHistoryReader {
  /** Return only this owner's completed workouts; empty history is an empty list, never null. */
  List<OwnedWorkout> findByUserId(long userId);

  /** Owner metadata allows the service to reject adapter mistakes before returning private data. */
  record OwnedWorkout(long userId, WorkoutResponse workout) {}
}
