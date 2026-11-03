package com.spotme.analytics;

import com.spotme.analytics.PersonalRecordDTO.Achievement;
import com.spotme.workout.SetHistoryEntry;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

/** Read-only records derived from one user's history. Does not persist calculated values. */
public final class PersonalRecordFinder {
  private final OneRepMaxCalculator oneRepMax = new OneRepMaxCalculator();
  private final VolumeCalculator volume = new VolumeCalculator();

  /**
   * Returns records in exercise-ID order. Ties retain the earliest date, then lowest workout ID.
   * Volume is summed per exercise per workout, including repeated exercise rows in that workout.
   * Callers provide one user's history in a consistent weight unit, without duplicated set rows.
   */
  public List<PersonalRecordDTO> findRecords(List<SetHistoryEntry> history) {
    if (history == null) {
      throw new IllegalArgumentException("Set history is required");
    }
    Map<Long, List<SetHistoryEntry>> exercises = new TreeMap<>();
    Map<Long, LocalDate> dates = new HashMap<>();
    for (var set : history) {
      if (set == null || set.date() == null || set.workoutId() <= 0 || set.exerciseId() <= 0) {
        throw new IllegalArgumentException("Each set needs valid workout/exercise IDs and a date");
      }
      OneRepMaxCalculator.validate(set.weight(), set.reps());
      LocalDate priorDate = dates.putIfAbsent(set.workoutId(), set.date());
      if (priorDate != null && !priorDate.equals(set.date())) {
        throw new IllegalArgumentException("A workout must have one consistent date");
      }
      exercises.computeIfAbsent(set.exerciseId(), ignored -> new ArrayList<>()).add(set);
    }
    List<PersonalRecordDTO> result = new ArrayList<>();
    for (var exercise : exercises.entrySet()) {
      Achievement weight = null;
      Achievement estimated = null;
      Achievement workoutVolume = null;
      for (var set : exercise.getValue()) {
        weight = best(weight, new Achievement(set.weight(), set.date(), set.workoutId()));
        Optional<BigDecimal> estimate = oneRepMax.calculate(set.weight(), set.reps());
        if (estimate.isPresent()) {
          estimated = best(estimated, new Achievement(estimate.get(), set.date(), set.workoutId()));
        }
      }
      for (var total : volume.byWorkout(exercise.getValue()).entrySet()) {
        workoutVolume = best(workoutVolume,
            new Achievement(total.getValue(), dates.get(total.getKey()), total.getKey()));
      }
      result.add(new PersonalRecordDTO(
          exercise.getKey(), weight, Optional.ofNullable(estimated), workoutVolume));
    }
    return List.copyOf(result);
  }

  private static Achievement best(Achievement current, Achievement candidate) {
    if (current == null) {
      return candidate;
    }
    int valueOrder = candidate.value().compareTo(current.value());
    int dateOrder = candidate.date().compareTo(current.date());
    if (valueOrder > 0 || (valueOrder == 0
        && (dateOrder < 0 || (dateOrder == 0 && candidate.workoutId() < current.workoutId())))) {
      return candidate;
    }
    return current;
  }
}
