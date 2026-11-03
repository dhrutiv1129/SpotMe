package com.spotme.workout;

/** Public workout-management interface. */
public interface WorkoutService {
  WorkoutResponse createWorkout(WorkoutRequest request);
}
