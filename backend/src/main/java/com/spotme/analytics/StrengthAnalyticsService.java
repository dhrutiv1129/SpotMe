package com.spotme.analytics;

import java.util.List;

/** Analytics for the authenticated user's saved workout history. */
public interface StrengthAnalyticsService {
  ExerciseProgressDTO getExerciseProgress(long exerciseId);

  List<PersonalRecordDTO> getPersonalRecords();
}
