package com.spotme.workout;

import java.time.LocalDate;
import java.util.List;

/** Public workout-management interface. */
public interface WorkoutService {
  WorkoutResponse createWorkout(WorkoutRequest request);

  /** Current user's history, newest date first, then descending workout ID. */
  List<WorkoutResponse> getWorkoutHistory();

  /** Current user's sets for an exercise, in history/exercise/set order. */
  List<SetHistoryEntry> getSetHistory(long exerciseId);

  /** Sorted distinct completed dates for consistency calculations. */
  List<LocalDate> getWorkoutDates();
}
