package com.spotme.analytics;

import java.util.List;
import java.util.Optional;

/** Chronological progress and records for one exercise. */
public record ExerciseProgressDTO(
    long exerciseId, List<ProgressPoint> points, Optional<PersonalRecordDTO> records) {
  public ExerciseProgressDTO {
    points = List.copyOf(points);
  }
}
